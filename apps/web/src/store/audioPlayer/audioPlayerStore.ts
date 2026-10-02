import type WaveSurfer from "wavesurfer.js";
import type { WaveSurferOptions } from "wavesurfer.js";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { MusicWebSocketMessage } from "#/data/webSocket";
import { sendMusicWebSocketMessage } from "#/lib/webSocket";

import { getWaveformData, resolvePlaybackSource } from "./audioPlayerFunction";
import type {
	AudioPlayerAction,
	AudioPlayerQueueEntry,
	AudioPlayerState,
	AudioPlayerTrack,
} from "./audioPlayerType";

export { autoSelectPlaybackQuality } from "./audioPlayerFunction";

type AudioPlayerStore = AudioPlayerState & AudioPlayerAction;
type PlaybackMessageAction = Extract<
	MusicWebSocketMessage["data"]["action"],
	"play" | "pause" | "change" | "end"
>;
type AudioPlayerPersistedState = Pick<
	AudioPlayerState,
	| "volume"
	| "muted"
	| "repeatMode"
	| "shuffle"
	| "playbackQuality"
	| "playTalkTrack"
	| "playInstrumental"
	| "queue"
	| "index"
>;

let waveSurfer: WaveSurfer | null = null;
let loadRequestId = 0;
let finishedRequestId = 0;

export const AUDIO_PLAYER_IDLE_PEAKS: WaveSurferOptions["peaks"] = [[0, 0]];
export const AUDIO_PLAYER_IDLE_DURATION = 1;

const initialState: AudioPlayerState = {
	queue: [],
	index: 0,
	status: "idle",
	currentPlayingKey: null,
	volume: 1,
	muted: false,
	hidden: false,
	repeatMode: "off",
	shuffle: false,
	shuffleHistory: [],
	shuffleHistoryIndex: -1,
	shuffleRemaining: [],
	playbackQuality: "Auto",
	playTalkTrack: false,
	playInstrumental: false,
	stopAfterMusicCount: null,
};

function createQueueEntries(
	tracks: AudioPlayerTrack[],
): AudioPlayerQueueEntry[] {
	return tracks.map((track) => ({
		...track,
		queueEntryId: crypto.randomUUID(),
	}));
}

function getNextIndex(
	index: number,
	queueLength: number,
	repeatMode: AudioPlayerState["repeatMode"],
): number | null {
	if (queueLength === 0) return null;
	if (repeatMode === "one") return index;

	const nextIndex = index + 1;
	if (nextIndex < queueLength) return nextIndex;
	if (repeatMode === "all") return 0;

	return null;
}

function getPrevIndex(
	index: number,
	queueLength: number,
	repeatMode: AudioPlayerState["repeatMode"],
): number | null {
	if (queueLength === 0) return null;
	if (index > 0) return index - 1;
	if (repeatMode === "all" && queueLength > 1) return queueLength - 1;

	return null;
}

function shouldAutoSkipTrack(
	track: AudioPlayerTrack | undefined,
	playTalkTrack: boolean,
	playInstrumental: boolean,
): boolean {
	if (!track) return true;
	return (
		(track.contentType === "MC" && !playTalkTrack) ||
		(track.versionType === "Instrumental" && !playInstrumental)
	);
}

function getNextAutoIndex(
	index: number,
	queue: AudioPlayerTrack[],
	repeatMode: AudioPlayerState["repeatMode"],
	playTalkTrack: boolean,
	playInstrumental: boolean,
): number | null {
	if (playTalkTrack && playInstrumental)
		return getNextIndex(index, queue.length, repeatMode);

	if (repeatMode === "one") {
		return shouldAutoSkipTrack(queue[index], playTalkTrack, playInstrumental)
			? null
			: index;
	}

	for (let offset = 1; offset < queue.length; offset++) {
		const nextIndex = index + offset;
		if (nextIndex >= queue.length) break;
		if (!shouldAutoSkipTrack(queue[nextIndex], playTalkTrack, playInstrumental))
			return nextIndex;
	}

	if (repeatMode !== "all") return null;

	for (
		let nextIndex = 0;
		nextIndex <= index && nextIndex < queue.length;
		nextIndex++
	) {
		if (!shouldAutoSkipTrack(queue[nextIndex], playTalkTrack, playInstrumental))
			return nextIndex;
	}

	return null;
}

function shuffleIndices(indices: number[]): number[] {
	for (let index = indices.length - 1; index > 0; index--) {
		const otherIndex = Math.floor(Math.random() * (index + 1));
		[indices[index], indices[otherIndex]] = [
			indices[otherIndex],
			indices[index],
		];
	}
	return indices;
}

function createShuffleState(
	queueLength: number,
	index: number,
	shuffle: boolean,
) {
	return {
		shuffleHistory: shuffle && queueLength > 0 ? [index] : [],
		shuffleHistoryIndex: shuffle && queueLength > 0 ? 0 : -1,
		shuffleRemaining: shuffle
			? shuffleIndices(
					Array.from({ length: queueLength }, (_, i) => i).filter(
						(i) => i !== index,
					),
				)
			: [],
	};
}

function recordShuffleTrack(state: AudioPlayerState, index: number): void {
	if (!state.shuffle) return;
	if (state.shuffleHistory[state.shuffleHistoryIndex] !== index) {
		state.shuffleHistory.splice(state.shuffleHistoryIndex + 1);
		state.shuffleHistory.push(index);
		state.shuffleHistoryIndex = state.shuffleHistory.length - 1;
	}
	state.shuffleRemaining = state.shuffleRemaining.filter((i) => i !== index);
}

function remapShuffleIndices(
	state: AudioPlayerState,
	mapIndex: (index: number) => number | null,
): void {
	const history = state.shuffleHistory.map(mapIndex);
	state.shuffleHistoryIndex =
		history
			.slice(0, state.shuffleHistoryIndex + 1)
			.filter((index) => index !== null).length - 1;
	state.shuffleHistory = history.filter((index) => index !== null);
	state.shuffleRemaining = state.shuffleRemaining
		.map(mapIndex)
		.filter((index) => index !== null);
}

function getNextPlayback(state: AudioPlayerState, automatic: boolean) {
	const { index, queue, repeatMode, playTalkTrack, playInstrumental } = state;
	const nextRepeatMode =
		!automatic && repeatMode === "one" ? "off" : repeatMode;
	const isEligible = (i: number) =>
		!automatic ||
		!shouldAutoSkipTrack(queue[i], playTalkTrack, playInstrumental);

	if (!state.shuffle || nextRepeatMode === "one") {
		const nextIndex = automatic
			? getNextAutoIndex(
					index,
					queue,
					nextRepeatMode,
					playTalkTrack,
					playInstrumental,
				)
			: getNextIndex(index, queue.length, nextRepeatMode);
		return nextIndex === null ? null : { index: nextIndex };
	}

	for (
		let cursor = state.shuffleHistoryIndex + 1;
		cursor < state.shuffleHistory.length;
		cursor++
	) {
		const nextIndex = state.shuffleHistory[cursor];
		if (isEligible(nextIndex))
			return { index: nextIndex, shuffleHistoryIndex: cursor };
	}

	let remaining = state.shuffleRemaining;
	let candidateIndex = remaining.findIndex(isEligible);
	if (candidateIndex === -1 && nextRepeatMode === "all") {
		remaining = shuffleIndices(queue.map((_, i) => i).filter(isEligible));
		if (remaining.length > 1 && remaining[0] === index) {
			[remaining[0], remaining[1]] = [remaining[1], remaining[0]];
		}
		candidateIndex = remaining.length > 0 ? 0 : -1;
	}
	if (candidateIndex === -1) return null;

	const nextIndex = remaining[candidateIndex];
	const history = state.shuffleHistory.slice(0, state.shuffleHistoryIndex + 1);
	history.push(nextIndex);
	return {
		index: nextIndex,
		shuffleHistory: history,
		shuffleHistoryIndex: history.length - 1,
		shuffleRemaining: remaining.slice(candidateIndex + 1),
	};
}

function clearPendingLoad(requestId: number): void {
	if (finishedRequestId === requestId) finishedRequestId = 0;
}

function isLoadPending(): boolean {
	return finishedRequestId !== 0 && finishedRequestId === loadRequestId;
}

function resetWaveSurferToIdle(): void {
	if (!waveSurfer) return;

	waveSurfer.empty();
	waveSurfer.setOptions({
		cursorWidth: 0,
		duration: AUDIO_PLAYER_IDLE_DURATION,
		interact: false,
		peaks: AUDIO_PLAYER_IDLE_PEAKS,
	});
}

function prepareWaveSurferForLoad(): void {
	if (!waveSurfer) return;

	waveSurfer.toggleInteraction(false);
	if (waveSurfer.isPlaying()) waveSurfer.pause();
	waveSurfer.seekTo(0);
	waveSurfer.empty();
}

function sendPlaybackMessage(
	action: PlaybackMessageAction,
	track: AudioPlayerTrack | undefined,
): void {
	sendMusicWebSocketMessage({
		action,
		positionMs: Math.max(
			0,
			Math.round((waveSurfer?.getCurrentTime() ?? 0) * 1000),
		),
		...(track && { trackID: track.trackId }),
	});
}

async function loadAndPlay(
	playbackQuality: AudioPlayerState["playbackQuality"],
	track: AudioPlayerTrack,
	options: {
		autoplay?: boolean;
		currentTime?: number;
		messageAction?: "play" | "change";
	} = {},
): Promise<void> {
	const autoplay = options.autoplay ?? true;
	const requestId = ++loadRequestId;
	finishedRequestId = requestId;
	const playbackSource = resolvePlaybackSource(playbackQuality, track);
	console.log("[audio-player] loadAndPlay:start", {
		autoplay,
		playbackQuality: playbackSource.quality,
		requestId,
		trackId: track.trackId,
		title: track.title,
	});

	if (!waveSurfer) {
		console.log("[audio-player] loadAndPlay:no WaveSurfer instance");
		clearPendingLoad(requestId);
		useAudioPlayerStore.setState({ currentPlayingKey: null, status: "idle" });
		return;
	}

	if (useAudioPlayerStore.getState().currentPlayingKey === playbackSource.key) {
		if (options.currentTime !== undefined) {
			waveSurfer.setTime(options.currentTime);
		}

		try {
			if (autoplay) await waveSurfer.play();
		} catch (error) {
			if (requestId !== loadRequestId) return;
			console.log("[audio-player] loadAndPlay:play failed", error);
		}

		if (requestId !== loadRequestId) return;
		clearPendingLoad(requestId);
		useAudioPlayerStore.setState({
			status: autoplay && waveSurfer.isPlaying() ? "playing" : "paused",
		});
		if (options.messageAction && waveSurfer.isPlaying()) {
			sendPlaybackMessage(options.messageAction, track);
		}
		return;
	}

	prepareWaveSurferForLoad();

	const waveformData = track.audio.file.waveformB8Pixel20
		? await getWaveformData(track.audio.file.waveformB8Pixel20.url)
		: null;

	if (requestId !== loadRequestId) {
		console.log("[audio-player] loadAndPlay:stale before load", {
			requestId,
		});
		return;
	}

	console.log("[audio-player] loadAndPlay:load", {
		playbackUrl: playbackSource.url,
		requestId,
		trackId: track.trackId,
		withWaveform: Boolean(waveformData),
	});

	try {
		if (waveformData) {
			await waveSurfer.load(
				playbackSource.url,
				[waveformData],
				track.durationInMs / 1000,
			);
		} else {
			await waveSurfer.load(playbackSource.url);
		}
	} catch (error) {
		if (requestId !== loadRequestId) return;

		console.log("[audio-player] loadAndPlay:load failed", error);
		clearPendingLoad(requestId);
		resetWaveSurferToIdle();
		useAudioPlayerStore.setState({ currentPlayingKey: null, status: "idle" });
		return;
	}

	if (requestId !== loadRequestId) {
		console.log("[audio-player] loadAndPlay:stale before play", {
			requestId,
		});
		return;
	}

	if (options.currentTime !== undefined) {
		waveSurfer.setTime(options.currentTime);
	}

	if (!autoplay) {
		clearPendingLoad(requestId);
		waveSurfer.toggleInteraction(true);
		useAudioPlayerStore.setState({
			currentPlayingKey: playbackSource.key,
			status: "paused",
		});
		return;
	}

	try {
		console.log("[audio-player] loadAndPlay:play", {
			requestId,
			trackId: track.trackId,
		});
		await waveSurfer.play();
		if (requestId !== loadRequestId) return;
		waveSurfer.toggleInteraction(true);
	} catch (error) {
		if (requestId !== loadRequestId) return;

		console.log("[audio-player] loadAndPlay:play failed", error);
		clearPendingLoad(requestId);
		waveSurfer.toggleInteraction(true);
		useAudioPlayerStore.setState({
			currentPlayingKey: playbackSource.key,
			status: "paused",
		});
		return;
	}

	console.log("[audio-player] loadAndPlay:playing", {
		requestId,
		trackId: track.trackId,
	});
	clearPendingLoad(requestId);
	useAudioPlayerStore.setState({
		currentPlayingKey: playbackSource.key,
		status: "playing",
	});
	if (options.messageAction) sendPlaybackMessage(options.messageAction, track);
}

export const useAudioPlayerStore = create<AudioPlayerStore>()(
	devtools(
		persist(
			immer((set, get) => ({
				...initialState,
				bindWaveSurfer: (instance: WaveSurfer | null) => {
					console.log("[audio-player] bindWaveSurfer", {
						bound: Boolean(instance),
					});
					waveSurfer = instance;

					if (!waveSurfer) return;

					waveSurfer.setVolume(get().volume);
					waveSurfer.setMuted(get().muted);

					if (get().status === "idle") resetWaveSurferToIdle();
				},
				reloadAudio: async (options) => {
					const { currentPlayingKey, index, playbackQuality, queue, status } =
						get();
					const track = queue.at(index);
					if (
						!waveSurfer ||
						!track ||
						status === "idle" ||
						status === "loading"
					)
						return;

					const playbackSource = resolvePlaybackSource(playbackQuality, track);
					const state = get();
					if (
						state.queue.at(state.index)?.trackId !== track.trackId ||
						state.currentPlayingKey !== currentPlayingKey
					) {
						return;
					}

					const media = waveSurfer.getMediaElement();
					const currentTime = waveSurfer.getCurrentTime();
					const requestId = loadRequestId;
					const autoplay = options?.autoplay ?? waveSurfer.isPlaying();
					const seekToCurrentTime = () => {
						if (requestId !== loadRequestId) return;
						media.currentTime = currentTime;
					};

					media.addEventListener("loadedmetadata", seekToCurrentTime, {
						once: true,
					});
					media.src = playbackSource.url;
					media.load();

					if (autoplay) {
						try {
							await media.play();
							if (requestId !== loadRequestId) return;
							set({ status: "playing" });
						} catch (error) {
							if (requestId !== loadRequestId) return;
							console.log("[audio-player] reloadAudio:play failed", error);
							set({ status: "paused" });
						}
					}
				},
				playAlbum: (album: AudioPlayerTrack[], trackId?: string) => {
					console.log("[audio-player] playAlbum", {
						trackCount: album.length,
						trackId,
					});

					if (album.length === 0) {
						console.log("[audio-player] playAlbum:empty album");
						return;
					}

					let index = 0;
					if (trackId !== undefined) {
						index = album.findIndex((item) => item.trackId === trackId);
					}
					if (index === -1) {
						console.log("[audio-player] playAlbum:track not found", {
							trackId,
						});
						return;
					}

					const track = album[index];
					console.log("[audio-player] playAlbum:selected", {
						index,
						trackId: track.trackId,
						title: track.title,
					});
					set({
						queue: createQueueEntries(album),
						index,
						status: "loading",
						...createShuffleState(album.length, index, get().shuffle),
					});
					loadAndPlay(get().playbackQuality, track, {
						messageAction: "play",
					});
				},
				addToQueue: (tracks: AudioPlayerTrack[]) => {
					if (tracks.length === 0) return;
					set((state) => {
						const oldLength = state.queue.length;
						state.queue.push(...createQueueEntries(tracks));
						if (oldLength === 0) {
							state.index = 0;
							Object.assign(
								state,
								createShuffleState(state.queue.length, 0, state.shuffle),
							);
						} else if (state.shuffle) {
							state.shuffleRemaining.push(
								...shuffleIndices(tracks.map((_, i) => oldLength + i)),
							);
						}
					});
				},
				addNextToQueue: (tracks: AudioPlayerTrack[]) => {
					if (tracks.length === 0) return;
					if (get().queue.length === 0) {
						get().addToQueue(tracks);
						return;
					}
					set((state) => {
						const insertIndex = state.index + 1;
						remapShuffleIndices(state, (i) =>
							i >= insertIndex ? i + tracks.length : i,
						);
						state.queue.splice(insertIndex, 0, ...createQueueEntries(tracks));
						if (state.shuffle) {
							// Explicit play-next entries precede both forward history and shuffled entries.
							state.shuffleRemaining = [
								...tracks.map((_, i) => insertIndex + i),
								...state.shuffleHistory.slice(state.shuffleHistoryIndex + 1),
								...state.shuffleRemaining,
							];
							state.shuffleHistory.splice(state.shuffleHistoryIndex + 1);
						}
					});
				},
				removeFromQueue: (removeIndex) => {
					const { index, queue, status } = get();
					if (
						!Number.isInteger(removeIndex) ||
						removeIndex < 0 ||
						removeIndex >= queue.length
					)
						return;
					if (queue.length === 1) {
						get().clearQueue();
						return;
					}
					const removedCurrent = removeIndex === index;
					if (removedCurrent) {
						loadRequestId++;
						finishedRequestId = 0;
						sendPlaybackMessage("end", queue[index]);
						resetWaveSurferToIdle();
					}
					set((state) => {
						state.queue.splice(removeIndex, 1);
						remapShuffleIndices(state, (i) =>
							i === removeIndex ? null : i > removeIndex ? i - 1 : i,
						);
						state.index = removedCurrent
							? Math.min(removeIndex, state.queue.length - 1)
							: index > removeIndex
								? index - 1
								: index;
						if (removedCurrent) {
							recordShuffleTrack(state, state.index);
							state.currentPlayingKey = null;
							state.status = status === "idle" ? "idle" : "loading";
						}
					});
					if (removedCurrent && status !== "idle") {
						const state = get();
						loadAndPlay(state.playbackQuality, state.queue[state.index], {
							autoplay: status === "playing" || status === "loading",
							messageAction: "change",
						});
					}
				},
				moveQueueTrack: (fromIndex, toIndex) => {
					const { queue } = get();
					if (
						!Number.isInteger(fromIndex) ||
						!Number.isInteger(toIndex) ||
						fromIndex < 0 ||
						toIndex < 0 ||
						fromIndex >= queue.length ||
						toIndex >= queue.length ||
						fromIndex === toIndex
					)
						return;
					set((state) => {
						const mapIndex = (i: number) => {
							if (i === fromIndex) return toIndex;
							if (fromIndex < toIndex && i > fromIndex && i <= toIndex)
								return i - 1;
							if (toIndex < fromIndex && i >= toIndex && i < fromIndex)
								return i + 1;
							return i;
						};
						const [track] = state.queue.splice(fromIndex, 1);
						state.queue.splice(toIndex, 0, track);
						state.index = mapIndex(state.index);
						remapShuffleIndices(state, mapIndex);
					});
				},
				clearQueue: () => {
					const { queue, index } = get();
					loadRequestId++;
					finishedRequestId = 0;
					if (queue.length > 0) sendPlaybackMessage("end", queue[index]);
					set({
						queue: [],
						index: 0,
						currentPlayingKey: null,
						status: "idle",
						stopAfterMusicCount: null,
						...createShuffleState(0, 0, get().shuffle),
					});
					resetWaveSurferToIdle();
				},
				playQueueTrack: (index) => {
					const { playbackQuality, queue } = get();
					if (!Number.isInteger(index) || index < 0 || index >= queue.length)
						return;
					const track = queue[index];
					set((state) => {
						state.index = index;
						state.status = "loading";
						recordShuffleTrack(state, index);
					});
					loadAndPlay(playbackQuality, track, {
						currentTime: 0,
						messageAction: "play",
					});
				},
				playNext: () => {
					const state = get();
					const next = getNextPlayback(state, false);
					if (!next) return;
					set({ ...next, status: "loading" });
					loadAndPlay(state.playbackQuality, state.queue[next.index], {
						currentTime: 0,
						messageAction: "play",
					});
				},
				playPrev: () => {
					const state = get();
					const prevIndex = state.shuffle
						? (state.shuffleHistory[state.shuffleHistoryIndex - 1] ?? null)
						: getPrevIndex(state.index, state.queue.length, state.repeatMode);
					if (prevIndex === null) return;
					set((draft) => {
						draft.index = prevIndex;
						draft.status = "loading";
						if (draft.shuffle) draft.shuffleHistoryIndex--;
					});
					loadAndPlay(state.playbackQuality, state.queue[prevIndex], {
						currentTime: 0,
						messageAction: "play",
					});
				},
				togglePlay: async () => {
					const { index, playbackQuality, queue, status } = get();
					const track = queue.at(index);
					if (!track || status === "loading") return;

					if (status === "playing") {
						waveSurfer?.pause();
						sendPlaybackMessage("pause", track);
						return;
					}

					if (status === "paused" || status === "ready") {
						const requestId = loadRequestId;
						try {
							await waveSurfer?.play();
							if (requestId !== loadRequestId) return;
							set({ status: "playing" });
						} catch (error) {
							if (requestId !== loadRequestId) return;
							console.log("[audio-player] togglePlay:play failed", error);
							await get().reloadAudio({ autoplay: true });
						}
						if (waveSurfer?.isPlaying()) sendPlaybackMessage("play", track);

						return;
					}

					set({ status: "loading" });
					loadAndPlay(playbackQuality, track, { messageAction: "play" });
				},
				pause: () => {
					const track = get().queue.at(get().index);
					const wasPlaying = waveSurfer?.isPlaying() ?? false;
					waveSurfer?.pause();
					set((state) => {
						if (state.status === "playing") state.status = "paused";
					});
					if (wasPlaying) sendPlaybackMessage("pause", track);
				},
				toggleRepeatMode: () => {
					set((state) => {
						if (state.repeatMode === "off") {
							state.repeatMode = "all";
							return;
						}

						if (state.repeatMode === "all") {
							state.repeatMode = "one";
							return;
						}

						state.repeatMode = "off";
					});
				},
				toggleShuffle: () => {
					set((state) => {
						state.shuffle = !state.shuffle;
						Object.assign(
							state,
							createShuffleState(
								state.queue.length,
								state.index,
								state.shuffle,
							),
						);
					});
				},
				setVolume: (volume) => {
					const nextVolume = Math.min(Math.max(volume, 0), 1);
					waveSurfer?.setVolume(nextVolume);
					if (nextVolume > 0) waveSurfer?.setMuted(false);

					set((state) => {
						state.volume = nextVolume;
						if (nextVolume > 0) state.muted = false;
					});
				},
				setHidden: (hidden) => {
					set({ hidden });
				},
				toggleMute: () => {
					const muted = !get().muted;
					waveSurfer?.setMuted(muted);
					set({ muted });
				},
				setPlaybackQuality: (playbackQuality) => {
					const { currentPlayingKey, index, queue, status } = get();
					if (playbackQuality === get().playbackQuality) return;

					const track = queue.at(index);
					if (!track || status === "idle") {
						set({ playbackQuality });
						return;
					}

					const playbackSource = resolvePlaybackSource(playbackQuality, track);
					if (playbackSource.key === currentPlayingKey) {
						set({ playbackQuality });
						return;
					}

					const currentTime = waveSurfer?.getCurrentTime() ?? 0;
					set({ playbackQuality, status: "loading" });
					loadAndPlay(playbackQuality, track, {
						autoplay: status === "playing",
						currentTime,
					});
				},
				setPlayTalkTrack: (playTalkTrack) => {
					set({ playTalkTrack });
				},
				setPlayInstrumental: (playInstrumental) => {
					set({ playInstrumental });
				},
				setStopAfterMusicCount: (stopAfterMusicCount) => {
					set({ stopAfterMusicCount });
				},
				markReady: () => {
					if (isLoadPending()) return;

					set((state) => {
						if (state.status === "loading") state.status = "ready";
					});
				},
				markPlaying: (playing) => {
					if (isLoadPending()) return;

					set((state) => {
						if (playing) {
							if (state.status !== "idle") state.status = "playing";
							return;
						}

						if (state.status === "playing") state.status = "paused";
					});
				},
				markFinished: () => {
					if (finishedRequestId === loadRequestId) return;

					finishedRequestId = loadRequestId;
					const { index, playbackQuality, queue, stopAfterMusicCount } = get();

					if (queue.length === 0) {
						console.log("[audio-player] markFinished:empty queue");
						sendPlaybackMessage("end", undefined);
						resetWaveSurferToIdle();
						set({ currentPlayingKey: null, status: "idle" });
						return;
					}

					const finishedTrack = queue.at(index);
					if (
						finishedTrack?.contentType === "Music" &&
						stopAfterMusicCount !== null
					) {
						if (stopAfterMusicCount <= 1) {
							console.log("[audio-player] markFinished:stop after music");
							sendPlaybackMessage("end", finishedTrack);
							resetWaveSurferToIdle();
							set({
								currentPlayingKey: null,
								status: "idle",
								stopAfterMusicCount: null,
							});
							return;
						}

						set({ stopAfterMusicCount: stopAfterMusicCount - 1 });
					}

					const next = getNextPlayback(get(), true);
					const nextIndex = next?.index ?? null;
					if (nextIndex === null) {
						console.log("[audio-player] markFinished:end of queue");
						sendPlaybackMessage("end", finishedTrack);
						resetWaveSurferToIdle();
						set({ currentPlayingKey: null, status: "idle" });
						return;
					}

					const track = queue.at(nextIndex);
					if (!track) {
						console.log("[audio-player] markFinished:end of queue");
						sendPlaybackMessage("end", finishedTrack);
						resetWaveSurferToIdle();
						set({ currentPlayingKey: null, status: "idle" });
						return;
					}

					console.log("[audio-player] markFinished:next", {
						index: nextIndex,
						trackId: track.trackId,
						title: track.title,
					});

					set({ ...next, status: "loading" });
					loadAndPlay(playbackQuality, track, {
						currentTime: 0,
						messageAction: "change",
					});
				},
			})),
			{
				name: "audio-player-settings",
				storage: createJSONStorage(() => localStorage),
				merge: (persistedState, currentState) => {
					const state = {
						...currentState,
						...(persistedState as AudioPlayerPersistedState),
					};
					return {
						...state,
						queue: createQueueEntries(state.queue),
						...createShuffleState(
							state.queue.length,
							state.index,
							state.shuffle,
						),
					};
				},
				partialize: (state): AudioPlayerPersistedState => ({
					volume: state.volume,
					muted: state.muted,
					repeatMode: state.repeatMode,
					shuffle: state.shuffle,
					playbackQuality: state.playbackQuality,
					playTalkTrack: state.playTalkTrack,
					playInstrumental: state.playInstrumental,
					queue: state.queue,
					index: state.index,
				}),
			},
		),
	),
);
