import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { RadioTrack, RadioTrackRequest } from "@/lib/schema";
import type { TransferSnapshot } from "@/lib/webSocket";
import { savePlayedTrack } from "@/offline/downloads";
import type { PlaybackSource } from "@/player/engine";
import {
	audioPlayer,
	canPlay,
	isAvailable,
	resolveSource,
	showOnLockScreen,
	startListeningSession,
	trackListeningProgress,
	UnplayableError,
} from "@/player/engine";
import type { NextPlayback, QueueState, RepeatMode } from "@/player/queue";
import {
	createShuffleState,
	getNextPlayback,
	getPrevPlayback,
	getUpcomingIndices,
	moveQueueEntry,
	recordShuffleTrack,
	remapShuffleState,
	shuffleIndices,
} from "@/player/queue";
import type { PlayerTrack, QueueEntry } from "@/player/track";
import {
	createQueueEntries,
	findPlayerTrack,
	fromTransferTrack,
	toTransferTrack,
} from "@/player/track";
import { albumQueries } from "@/queries/albums";
import { getStreamingQuality, useSettingsStore } from "@/store/settingsStore";
import { showToast } from "@/store/toastStore";

/** `idle` means nothing is loaded, e.g. after a restart with a saved queue. */
export type PlayerStatus = "idle" | "loading" | "playing" | "paused";

type SavedPlayer = QueueState & {
	/** Adds a similar track when the queue runs out. */
	radio: boolean;
	/** Whether automatic playback includes Talk tracks, like the web player. */
	playTalkTrack: boolean;
	/** Whether automatic playback includes Instrumental tracks. */
	playInstrumental: boolean;
};

type PlayerState = SavedPlayer & {
	status: PlayerStatus;
	/** Why the current track could not load. */
	error: string | null;
	/** The file being played; null until a track loads. */
	source: PlaybackSource | null;
	/** Music tracks left before playback stops; other tracks do not count. */
	stopAfterMusicCount: number | null;
	playTracks: (
		tracks: PlayerTrack[],
		startIndex?: number,
		options?: { shuffle?: boolean },
	) => void;
	addToQueue: (tracks: PlayerTrack[]) => void;
	playNext: (tracks: PlayerTrack[]) => void;
	removeFromQueue: (index: number) => void;
	clearQueue: () => void;
	playQueueTrack: (index: number) => void;
	skipNext: () => void;
	skipPrevious: () => void;
	togglePlayback: () => void;
	seekTo: (seconds: number) => void;
	toggleShuffle: () => void;
	cycleRepeatMode: () => void;
	toggleRadio: () => void;
	/** Moves a track within Next up; positions are in play order. */
	moveUpcoming: (from: number, to: number) => void;
	setPlayTalkTrack: (playTalkTrack: boolean) => void;
	setPlayInstrumental: (playInstrumental: boolean) => void;
	setStopAfterMusicCount: (count: number | null) => void;
};

const storageKey = "player";
// Pressing previous later than this restarts the track instead.
const restartThresholdSeconds = 3;
const repeatModes: RepeatMode[] = ["off", "all", "one"];

function loadSaved(): SavedPlayer {
	const saved = Storage.getItemSync(storageKey);
	if (saved) return JSON.parse(saved) as SavedPlayer;
	return {
		queue: [],
		index: 0,
		repeatMode: "off",
		shuffle: false,
		radio: false,
		playTalkTrack: false,
		playInstrumental: false,
		...createShuffleState(0, 0, false),
	};
}

export const usePlayerStore = create<PlayerState>()((set, get) => ({
	...loadSaved(),
	status: "idle",
	error: null,
	source: null,
	stopAfterMusicCount: null,
	playTracks: (tracks, startIndex = 0, options) => {
		if (tracks.length === 0) return;
		const shuffle = options?.shuffle ?? get().shuffle;
		const queue = createQueueEntries(tracks);
		const index = options?.shuffle
			? Math.floor(Math.random() * queue.length)
			: startIndex;
		set({
			queue,
			index,
			shuffle,
			...createShuffleState(queue.length, index, shuffle),
		});
		void load(queue[index]);
	},
	addToQueue: (tracks) => {
		if (tracks.length === 0) return;
		const state = get();
		const length = state.queue.length;
		const queue = [...state.queue, ...createQueueEntries(tracks)];
		if (length === 0) {
			set({
				queue,
				index: 0,
				...createShuffleState(queue.length, 0, state.shuffle),
			});
			return;
		}
		set({
			queue,
			shuffleRemaining: state.shuffle
				? [
						...state.shuffleRemaining,
						...shuffleIndices(tracks.map((_, i) => length + i)),
					]
				: state.shuffleRemaining,
		});
	},
	playNext: (tracks) => {
		if (tracks.length === 0) return;
		const state = get();
		if (state.queue.length === 0) {
			state.addToQueue(tracks);
			return;
		}
		const insertIndex = state.index + 1;
		const shuffle = remapShuffleState(state, (i) =>
			i >= insertIndex ? i + tracks.length : i,
		);
		const queue = [...state.queue];
		queue.splice(insertIndex, 0, ...createQueueEntries(tracks));
		set({
			queue,
			...shuffle,
			// Tracks added with Play next come before the rest of the shuffle order.
			...(state.shuffle && {
				shuffleHistory: shuffle.shuffleHistory.slice(
					0,
					shuffle.shuffleHistoryIndex + 1,
				),
				shuffleRemaining: [
					...tracks.map((_, i) => insertIndex + i),
					...shuffle.shuffleHistory.slice(shuffle.shuffleHistoryIndex + 1),
					...shuffle.shuffleRemaining,
				],
			}),
		});
	},
	removeFromQueue: (removeIndex) => {
		const state = get();
		if (removeIndex < 0 || removeIndex >= state.queue.length) return;
		if (state.queue.length === 1) {
			state.clearQueue();
			return;
		}
		const queue = state.queue.filter((_, i) => i !== removeIndex);
		const shuffle = remapShuffleState(state, (i) =>
			i === removeIndex ? null : i > removeIndex ? i - 1 : i,
		);
		if (removeIndex !== state.index) {
			const index = state.index > removeIndex ? state.index - 1 : state.index;
			set({ queue, index, ...shuffle });
			return;
		}

		// Continues with the track that was next, in list or shuffle order.
		const fallbackIndex = Math.min(removeIndex, queue.length - 1);
		const next = state.shuffle
			? getNextPlayback(
					{ ...state, queue, index: fallbackIndex, ...shuffle },
					false,
					isAvailable,
				)
			: null;
		set({ queue, index: fallbackIndex, ...shuffle, ...next });
		const { index } = get();
		set(recordShuffleTrack(get(), index));
		if (state.status === "idle") return;
		void load(queue[index], {
			autoplay: state.status === "playing" || state.status === "loading",
		});
	},
	clearQueue: () => {
		loadId++;
		audioPlayer.pause();
		audioPlayer.clearLockScreenControls();
		set({
			queue: [],
			index: 0,
			status: "idle",
			error: null,
			source: null,
			stopAfterMusicCount: null,
			...createShuffleState(0, 0, false),
		});
	},
	playQueueTrack: (index) => {
		const state = get();
		const entry = state.queue.at(index);
		if (!entry) return;
		set({ index, ...recordShuffleTrack(state, index) });
		void load(entry);
	},
	skipNext: () => {
		const state = get();
		const next = getNextPlayback(state, false, isAvailable);
		if (next) playPlayback(next);
		else if (state.radio && state.queue.length > 0) void playRadioTrack();
	},
	skipPrevious: () => {
		const prev =
			audioPlayer.currentTime > restartThresholdSeconds
				? null
				: getPrevPlayback(get(), isAvailable);
		if (prev) playPlayback(prev);
		else get().seekTo(0);
	},
	togglePlayback: () => {
		const { queue, index, status, error } = get();
		const entry = queue.at(index);
		if (!entry || status === "loading") return;
		if (status === "playing") {
			audioPlayer.pause();
			set({ status: "paused" });
		} else if (status === "idle" || error) {
			void load(entry);
		} else {
			audioPlayer.play();
			set({ status: "playing" });
		}
	},
	seekTo: (seconds) => {
		void audioPlayer.seekTo(seconds);
		for (const listener of seekListeners) listener();
	},
	toggleShuffle: () => {
		const state = get();
		const shuffle = !state.shuffle;
		set({
			shuffle,
			...createShuffleState(state.queue.length, state.index, shuffle),
		});
	},
	cycleRepeatMode: () => {
		const { repeatMode } = get();
		set({
			repeatMode:
				repeatModes[(repeatModes.indexOf(repeatMode) + 1) % repeatModes.length],
		});
	},
	toggleRadio: () => set((state) => ({ radio: !state.radio })),
	moveUpcoming: (from, to) => {
		const state = get();
		const upcoming = getUpcomingIndices(state);
		if (
			from === to ||
			Math.min(from, to) < 0 ||
			Math.max(from, to) >= upcoming.length
		)
			return;
		if (!state.shuffle) {
			set(moveQueueEntry(state, upcoming[from], upcoming[to]));
			return;
		}
		// The shuffle order is the play order, so it is reordered instead of the list.
		const order = [...upcoming];
		const [moved] = order.splice(from, 1);
		order.splice(to, 0, moved);
		set({
			shuffleHistory: state.shuffleHistory.slice(
				0,
				state.shuffleHistoryIndex + 1,
			),
			shuffleRemaining: order,
		});
	},
	setPlayTalkTrack: (playTalkTrack) => set({ playTalkTrack }),
	setPlayInstrumental: (playInstrumental) => set({ playInstrumental }),
	setStopAfterMusicCount: (stopAfterMusicCount) => set({ stopAfterMusicCount }),
}));

/** Talk and Instrumental tracks are skipped automatically unless enabled, like the web player. */
function isAutoPlayable(entry: QueueEntry) {
	const { playTalkTrack, playInstrumental } = usePlayerStore.getState();
	return (
		canPlay(entry) &&
		(playTalkTrack || entry.contentType !== "MC") &&
		(playInstrumental || entry.versionType !== "Instrumental")
	);
}

// Each load gets an id so a slow, outdated load cannot replace a newer one.
let loadId = 0;
let finishedLoadId = -1;
const seekListeners = new Set<() => void>();

/** Calls the listener when the user seeks; returns an unsubscribe function. */
export function onPlayerSeek(listener: () => void) {
	seekListeners.add(listener);
	return () => {
		seekListeners.delete(listener);
	};
}

/** Resolves whether the track loaded; false when it failed or a newer load replaced it. */
async function load(
	entry: QueueEntry,
	{ autoplay = true, position }: { autoplay?: boolean; position?: number } = {},
): Promise<boolean> {
	const id = ++loadId;
	// Stops the previous track so it never plays under the new track's details.
	audioPlayer.pause();
	usePlayerStore.setState({ status: "loading", error: null });

	let source: PlaybackSource;
	try {
		source = await resolveSource(entry);
	} catch (error) {
		if (id !== loadId) return false;
		const message = error instanceof Error ? error.message : "Unable to play";
		if (error instanceof UnplayableError) showToast(message);
		// The previous file stays loaded, so its lock screen controls are removed
		// (the status listener also pauses it while in error).
		audioPlayer.clearLockScreenControls();
		usePlayerStore.setState({ status: "paused", error: message, source: null });
		return false;
	}
	if (id !== loadId) return false;

	showNotice(entry, source.notice);
	if (!source.isLocal && useSettingsStore.getState().savePlayedTracks) {
		void savePlayed(entry, source.file);
	}
	audioPlayer.replace({ uri: source.uri });
	if (position !== undefined) void audioPlayer.seekTo(position);
	showOnLockScreen(entry);
	// Reloading at a new quality continues the same listening session.
	if (position === undefined) startListeningSession(entry);
	if (autoplay) audioPlayer.play();
	usePlayerStore.setState({ status: autoplay ? "playing" : "paused", source });
	return true;
}

// A fallback notice repeats for every track of e.g. a DSF album, so it shows once per album.
let lastNotice: string | null = null;

function showNotice(entry: QueueEntry, notice: string | null) {
	const key = notice && `${entry.albumId}:${notice}`;
	if (key && key !== lastNotice) showToast(notice);
	lastNotice = key;
}

/** Saves a track that streams, so it plays offline later. */
async function savePlayed(entry: QueueEntry, file: PlaybackSource["file"]) {
	try {
		const album = await queryClient.fetchQuery(
			albumQueries.detail(entry.albumId),
		);
		savePlayedTrack(album, entry.trackId, file);
	} catch {
		// Saving is best effort; the track still streams.
	}
}

function playPlayback(next: NextPlayback) {
	const state = usePlayerStore.getState();
	const entry = state.queue[next.index];
	usePlayerStore.setState(next);
	// Repeat-one replays the loaded file instead of fetching it again.
	if (next.index === state.index && state.status !== "idle" && !state.error) {
		state.seekTo(0);
		audioPlayer.play();
		startListeningSession(entry);
		usePlayerStore.setState({ status: "playing" });
		return;
	}
	void load(entry);
}

/** Appends a track similar to the queue and plays it. */
async function playRadioTrack() {
	const id = ++loadId;
	audioPlayer.pause();
	usePlayerStore.setState({ status: "loading", error: null });
	const { queue, playInstrumental } = usePlayerStore.getState();

	let track: PlayerTrack | null = null;
	try {
		const request: RadioTrackRequest = {
			queueTrackIds: [...new Set(queue.map((entry) => entry.trackId))],
			includeInstrumental: playInstrumental,
		};
		const pick = await api<RadioTrack | null>("/tracks/radio", {
			method: "POST",
			body: request,
		});
		if (pick) {
			const album = await queryClient.fetchQuery(
				albumQueries.detail(pick.albumId),
			);
			track = findPlayerTrack(album, pick.albumDiscId, pick.trackId);
		}
	} catch {
		// Treated like no pick below.
	}
	if (id !== loadId) return;

	if (!track) {
		finishPlayback();
		return;
	}
	const state = usePlayerStore.getState();
	const [entry] = createQueueEntries([track]);
	const index = state.queue.length;
	usePlayerStore.setState({ queue: [...state.queue, entry], index });
	usePlayerStore.setState(recordShuffleTrack(usePlayerStore.getState(), index));
	void load(entry);
}

/** The queue ran out: stays on the last track, paused at its start. */
function finishPlayback() {
	audioPlayer.pause();
	void audioPlayer.seekTo(0);
	usePlayerStore.setState({ status: "paused" });
}

function onTrackFinished() {
	const state = usePlayerStore.getState();
	const finished = state.queue.at(state.index);
	if (finished?.contentType === "Music" && state.stopAfterMusicCount !== null) {
		if (state.stopAfterMusicCount <= 1) {
			usePlayerStore.setState({ stopAfterMusicCount: null });
			finishPlayback();
			return;
		}
		usePlayerStore.setState({
			stopAfterMusicCount: state.stopAfterMusicCount - 1,
		});
	}

	const next = getNextPlayback(state, true, isAutoPlayable);
	if (next) playPlayback(next);
	else if (state.radio) void playRadioTrack();
	else finishPlayback();
}

audioPlayer.addListener("playbackStatusUpdate", (status) => {
	trackListeningProgress(status.currentTime);

	if (status.didJustFinish) {
		if (finishedLoadId === loadId) return;
		finishedLoadId = loadId;
		onTrackFinished();
		return;
	}
	if (status.playing) finishedLoadId = -1;

	// Follows pauses from the lock screen, headphones, or other apps.
	const { status: current, error } = usePlayerStore.getState();
	if (error && status.playing) {
		// e.g. a headset key resuming the file loaded before a failed track.
		audioPlayer.pause();
		return;
	}
	if (
		current === "playing" &&
		!status.playing &&
		status.isLoaded &&
		!status.isBuffering
	) {
		usePlayerStore.setState({ status: "paused" });
	} else if (current === "paused" && status.playing) {
		usePlayerStore.setState({ status: "playing" });
	}
});

// Next and previous from the lock screen, notification, or headset.
audioPlayer.addListener("remoteCommand", ({ command }) => {
	const { skipNext, skipPrevious } = usePlayerStore.getState();
	if (command === "next") skipNext();
	else skipPrevious();
});

useSettingsStore.subscribe((settings, prev) => {
	const { queue, index, status, source } = usePlayerStore.getState();
	const entry = queue.at(index);
	if (!entry || !source || source.isLocal) return;
	const qualityChanged =
		getStreamingQuality(settings) !== getStreamingQuality(prev);

	// Turning on saving also saves the track streaming now.
	if (settings.savePlayedTracks && !prev.savePlayedTracks && !qualityChanged) {
		void savePlayed(entry, source.file);
	}
	// A new streaming quality applies right away, from the same position.
	if (qualityChanged && (status === "playing" || status === "paused")) {
		void load(entry, {
			autoplay: status === "playing",
			position: audioPlayer.currentTime,
		});
	}
});

usePlayerStore.subscribe((state, prev) => {
	const saved: SavedPlayer = {
		queue: state.queue,
		index: state.index,
		repeatMode: state.repeatMode,
		shuffle: state.shuffle,
		radio: state.radio,
		playTalkTrack: state.playTalkTrack,
		playInstrumental: state.playInstrumental,
		// The shuffle order is saved so a dragged order survives restarts.
		shuffleHistory: state.shuffleHistory,
		shuffleHistoryIndex: state.shuffleHistoryIndex,
		shuffleRemaining: state.shuffleRemaining,
	};
	if (
		Object.keys(saved).every(
			(key) =>
				saved[key as keyof SavedPlayer] === prev[key as keyof SavedPlayer],
		)
	)
		return;
	Storage.setItemSync(storageKey, JSON.stringify(saved));
});

/** The queue and position to move to another device; null when nothing is queued. */
export function getTransferSnapshot(): TransferSnapshot | null {
	const { queue, index, status } = usePlayerStore.getState();
	if (!queue.at(index)) return null;
	return {
		queue: queue.map(toTransferTrack),
		index,
		positionMs: Math.max(0, Math.round(audioPlayer.currentTime * 1000)),
		playing: status === "playing" || status === "loading",
	};
}

/** Rebuilds a moved queue from its albums, skipping tracks this phone cannot play. */
async function resolveTransferQueue({ queue, index }: TransferSnapshot) {
	const albumIds = [...new Set(queue.map((track) => track.albumId))];
	const albums = new Map(
		await Promise.all(
			albumIds.map(async (albumId) => {
				const album = await queryClient
					.ensureQueryData(albumQueries.detail(albumId))
					.catch(() => null);
				return [albumId, album] as const;
			}),
		),
	);

	const tracks: PlayerTrack[] = [];
	let currentIndex: number | null = null;
	for (const [i, item] of queue.entries()) {
		const album = albums.get(item.albumId);
		const track = album ? fromTransferTrack(album, item) : null;
		if (!track) continue;
		if (i === index) currentIndex = tracks.length;
		tracks.push(track);
	}
	return currentIndex === null ? null : { tracks, index: currentIndex };
}

/**
 * Takes over playback moved from another device. Resolves true once it loaded;
 * on failure, this phone's queue is restored.
 */
export async function adoptTransfer(snapshot: TransferSnapshot) {
	const startLoadId = loadId;
	const resolved = await resolveTransferQueue(snapshot);
	// Something else started playing meanwhile.
	if (!resolved || loadId !== startLoadId) return false;

	const previous = usePlayerStore.getState();
	const queue = createQueueEntries(resolved.tracks);
	const entry = queue[resolved.index];
	usePlayerStore.setState({
		queue,
		index: resolved.index,
		stopAfterMusicCount: null,
		...createShuffleState(queue.length, resolved.index, previous.shuffle),
	});
	startListeningSession(entry);
	const loading = load(entry, {
		autoplay: snapshot.playing,
		position: snapshot.positionMs / 1000,
	});
	const id = loadId;
	if (await loading) return true;
	if (loadId !== id) return false;

	loadId++;
	audioPlayer.pause();
	audioPlayer.clearLockScreenControls();
	usePlayerStore.setState({
		queue: previous.queue,
		index: previous.index,
		shuffleHistory: previous.shuffleHistory,
		shuffleHistoryIndex: previous.shuffleHistoryIndex,
		shuffleRemaining: previous.shuffleRemaining,
		stopAfterMusicCount: previous.stopAfterMusicCount,
		status: "idle",
		error: null,
		source: null,
	});
	return false;
}

/** Stops here after another device took over; the queue stays. */
export function stopForTransfer() {
	const { status } = usePlayerStore.getState();
	// Cancels a track or radio pick still loading so it cannot start afterwards.
	loadId++;
	audioPlayer.pause();
	if (status === "loading") {
		audioPlayer.clearLockScreenControls();
		usePlayerStore.setState({ status: "idle", error: null, source: null });
	} else if (status === "playing") {
		usePlayerStore.setState({ status: "paused" });
	}
}
