import type { components } from "@api/schema";
import Storage from "expo-sqlite/kv-store";
import { create } from "zustand";

import { showToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { savePlayedTrack } from "@/lib/offline/downloads";
import type { PlaybackSource } from "@/lib/player/engine";
import {
	audioPlayer,
	canPlay,
	getStreamingQuality,
	isAvailable,
	resolveSource,
	shouldSavePlayedTracks,
	showOnLockScreen,
	startListeningSession,
	trackListeningProgress,
	UnplayableError,
} from "@/lib/player/engine";
import type { NextPlayback, QueueState, RepeatMode } from "@/lib/player/queue";
import {
	createShuffleState,
	getNextPlayback,
	getPrevPlayback,
	getUpcomingIndices,
	recordShuffleTrack,
	remapShuffleState,
	shuffleIndices,
} from "@/lib/player/queue";
import type { PlayerTrack, QueueEntry } from "@/lib/player/track";
import { createQueueEntries, toPlayerTrack } from "@/lib/player/track";
import { albumQueries } from "@/lib/queries/album.queries";
import { queryClient } from "@/lib/query-client";
import { useSettingsStore } from "@/store/settingsStore";

/** `idle` means nothing is loaded, e.g. after a restart with a saved queue. */
export type PlayerStatus = "idle" | "loading" | "playing" | "paused";

type PlayerState = QueueState & {
	status: PlayerStatus;
	/** Adds a similar track when the queue runs out. */
	radio: boolean;
	/** Why the current track could not load. */
	error: string | null;
	/** The file being played; null until a track loads. */
	source: PlaybackSource | null;
	/** Whether automatic playback includes Talk tracks; like the web player. */
	playTalkTrack: boolean;
	/** Whether automatic playback includes Instrumental tracks. */
	playInstrumental: boolean;
	/** Music tracks left before playback stops; non-music tracks do not count. */
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
	/** Moves a track within "Next up"; positions are in play order. */
	moveUpcoming: (from: number, to: number) => void;
	setPlayTalkTrack: (playTalkTrack: boolean) => void;
	setPlayInstrumental: (playInstrumental: boolean) => void;
	setStopAfterMusicCount: (count: number | null) => void;
};

type SavedPlayer = Pick<
	PlayerState,
	| "queue"
	| "index"
	| "repeatMode"
	| "shuffle"
	| "radio"
	| "playTalkTrack"
	| "playInstrumental"
	// The shuffle order is saved so a dragged order survives restarts.
	| "shuffleHistory"
	| "shuffleHistoryIndex"
	| "shuffleRemaining"
>;

const storageKey = "player";
// Pressing previous later than this restarts the track instead.
const restartThresholdSeconds = 3;

const defaultPlayer: SavedPlayer = {
	queue: [],
	index: 0,
	repeatMode: "off",
	shuffle: false,
	radio: false,
	playTalkTrack: false,
	playInstrumental: false,
	...createShuffleState(0, 0, false),
};

function loadSaved(): SavedPlayer {
	const saved = Storage.getItemSync(storageKey);
	return saved ? (JSON.parse(saved) as SavedPlayer) : defaultPlayer;
}

const saved = loadSaved();

export const usePlayerStore = create<PlayerState>()((set, get) => ({
	...saved,
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
		const oldLength = state.queue.length;
		const queue = [...state.queue, ...createQueueEntries(tracks)];
		if (oldLength === 0) {
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
						...shuffleIndices(tracks.map((_, i) => oldLength + i)),
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
			// Tracks added with "play next" come before the rest of the shuffle order.
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
		const removedCurrent = removeIndex === state.index;
		const queue = state.queue.filter((_, i) => i !== removeIndex);
		const shuffle = remapShuffleState(state, (i) =>
			i === removeIndex ? null : i > removeIndex ? i - 1 : i,
		);
		if (!removedCurrent) {
			const index = state.index > removeIndex ? state.index - 1 : state.index;
			set({ queue, index, ...shuffle });
			return;
		}

		// Continue with the track that was next: in list order, or in shuffle order.
		const fallbackIndex = Math.min(removeIndex, queue.length - 1);
		const next = state.shuffle
			? getNextPlayback(
					{ ...state, queue, index: fallbackIndex, ...shuffle },
					false,
					isAvailable,
				)
			: null;
		set({ queue, index: fallbackIndex, ...shuffle, ...next });
		const index = get().index;
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
			...createShuffleState(0, 0, get().shuffle),
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
		if (next) {
			playPlayback(next);
			return;
		}
		if (state.radio && state.queue.length > 0) void playRadioTrack();
	},
	skipPrevious: () => {
		const state = get();
		const prev =
			audioPlayer.currentTime > restartThresholdSeconds
				? null
				: getPrevPlayback(state, isAvailable);
		if (prev) {
			playPlayback(prev);
			return;
		}
		void audioPlayer.seekTo(0);
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
		const order: RepeatMode[] = ["off", "all", "one"];
		const { repeatMode } = get();
		set({ repeatMode: order[(order.indexOf(repeatMode) + 1) % order.length] });
	},
	toggleRadio: () => set((state) => ({ radio: !state.radio })),
	moveUpcoming: (from, to) => {
		const state = get();
		const upcoming = getUpcomingIndices(state);
		if (
			from === to ||
			from < 0 ||
			to < 0 ||
			from >= upcoming.length ||
			to >= upcoming.length
		)
			return;
		if (state.shuffle) {
			// The shuffle order is the play order, so reorder it rather than the list.
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
			return;
		}
		set(moveQueueEntry(state, upcoming[from], upcoming[to]));
	},
	setPlayTalkTrack: (playTalkTrack) => set({ playTalkTrack }),
	setPlayInstrumental: (playInstrumental) => set({ playInstrumental }),
	setStopAfterMusicCount: (stopAfterMusicCount) => set({ stopAfterMusicCount }),
}));

/** Moves one queue entry, keeping the current index and shuffle order pointing at the same tracks. */
function moveQueueEntry(state: QueueState, fromIndex: number, toIndex: number) {
	const mapIndex = (i: number) => {
		if (i === fromIndex) return toIndex;
		if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
		if (toIndex < fromIndex && i >= toIndex && i < fromIndex) return i + 1;
		return i;
	};
	const queue = [...state.queue];
	const [entry] = queue.splice(fromIndex, 1);
	queue.splice(toIndex, 0, entry);
	return {
		queue,
		index: mapIndex(state.index),
		...remapShuffleState(state, mapIndex),
	};
}

/** Talk and Instrumental tracks are skipped automatically unless enabled; like the web player. */
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

async function load(
	entry: QueueEntry,
	options: { autoplay?: boolean; position?: number } = {},
) {
	const id = ++loadId;
	const autoplay = options.autoplay ?? true;
	// Stop the previous track so it never plays under the new track's details.
	audioPlayer.pause();
	usePlayerStore.setState({ status: "loading", error: null });

	let source: PlaybackSource;
	try {
		source = await resolveSource(entry);
	} catch (error) {
		if (id !== loadId) return;
		const message = error instanceof Error ? error.message : "Unable to play";
		if (error instanceof UnplayableError) showToast(message);
		// The previous file stays loaded; remove its lock screen controls so they
		// cannot resume it (the status listener also pauses it while in error).
		audioPlayer.clearLockScreenControls();
		usePlayerStore.setState({ status: "paused", error: message, source: null });
		return;
	}
	if (id !== loadId) return;

	showNotice(entry, source.notice);
	if (!source.isLocal && shouldSavePlayedTracks()) {
		void savePlayed(entry, source.file);
	}
	audioPlayer.replace({ uri: source.uri });
	const isReload = options.position !== undefined;
	if (isReload) void audioPlayer.seekTo(options.position ?? 0);
	showOnLockScreen(entry);
	// Reloading at a new quality continues the same listening session.
	if (!isReload) startListeningSession(entry);
	if (autoplay) audioPlayer.play();
	usePlayerStore.setState({ status: autoplay ? "playing" : "paused", source });
}

// A fallback notice repeats for every track of e.g. a DSF album, so show it once per album.
let lastNotice: string | null = null;

function showNotice(entry: QueueEntry, notice: string | null) {
	const key = notice && `${entry.albumId}:${notice}`;
	if (key && key !== lastNotice) showToast(notice);
	lastNotice = key;
}

/** Saves a track streaming on Wi‑Fi so it plays offline later. */
async function savePlayed(entry: QueueEntry, file: PlaybackSource["file"]) {
	try {
		const album = await queryClient.fetchQuery(
			albumQueries.getAlbum(entry.albumId),
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
		void audioPlayer.seekTo(0);
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
	const { queue } = usePlayerStore.getState();

	let track: PlayerTrack | null = null;
	try {
		const result = await apiFetch<components["schemas"]["RadioTrack"] | null>(
			"/tracks/radio",
			{
				method: "POST",
				body: JSON.stringify({
					queueTrackIds: [...new Set(queue.map((entry) => entry.trackId))],
					includeInstrumental: usePlayerStore.getState().playInstrumental,
				}),
			},
		);
		const pick = result.data;
		if (pick) {
			const album = await queryClient.fetchQuery(
				albumQueries.getAlbum(pick.albumId),
			);
			const disc = album.discs.find(
				(item) => String(item.albumDiscId) === String(pick.albumDiscId),
			);
			const albumTrack = disc?.tracks.find(
				(item) => String(item.trackId) === String(pick.trackId),
			);
			if (disc && albumTrack) track = toPlayerTrack(album, disc, albumTrack);
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

/** The queue ran out: stay on the last track, paused at its start. */
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

	// Follow pauses from the lock screen, headphones, or other apps.
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

// A new streaming quality applies right away, from the same position.
useSettingsStore.subscribe((settings, prev) => {
	const { queue, index, status, source } = usePlayerStore.getState();
	const entry = queue.at(index);
	// Turning on saving also saves the track that is streaming now.
	if (
		settings.savePlayedTracks &&
		!prev.savePlayedTracks &&
		entry &&
		source &&
		!source.isLocal &&
		getStreamingQuality(settings) === getStreamingQuality(prev)
	) {
		void savePlayed(entry, source.file);
	}
	if (
		getStreamingQuality(settings) === getStreamingQuality(prev) ||
		!entry ||
		!source ||
		source.isLocal ||
		(status !== "playing" && status !== "paused")
	)
		return;
	void load(entry, {
		autoplay: status === "playing",
		position: audioPlayer.currentTime,
	});
});

usePlayerStore.subscribe((state, prev) => {
	if (
		state.queue === prev.queue &&
		state.index === prev.index &&
		state.repeatMode === prev.repeatMode &&
		state.shuffle === prev.shuffle &&
		state.radio === prev.radio &&
		state.playTalkTrack === prev.playTalkTrack &&
		state.playInstrumental === prev.playInstrumental &&
		state.shuffleHistory === prev.shuffleHistory &&
		state.shuffleHistoryIndex === prev.shuffleHistoryIndex &&
		state.shuffleRemaining === prev.shuffleRemaining
	)
		return;
	const value: SavedPlayer = {
		queue: state.queue,
		index: state.index,
		repeatMode: state.repeatMode,
		shuffle: state.shuffle,
		radio: state.radio,
		playTalkTrack: state.playTalkTrack,
		playInstrumental: state.playInstrumental,
		shuffleHistory: state.shuffleHistory,
		shuffleHistoryIndex: state.shuffleHistoryIndex,
		shuffleRemaining: state.shuffleRemaining,
	};
	Storage.setItemSync(storageKey, JSON.stringify(value));
});
