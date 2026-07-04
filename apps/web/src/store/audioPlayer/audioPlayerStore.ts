import type WaveSurfer from "wavesurfer.js";
import type { WaveSurferOptions } from "wavesurfer.js";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { getWaveformData, resolvePlaybackSource } from "./audioPlayerFunction";
import type {
	AudioPlayerAction,
	AudioPlayerState,
	AudioPlayerTrack,
} from "./audioPlayerType";

export { autoSelectPlaybackQuality } from "./audioPlayerFunction";

type AudioPlayerStore = AudioPlayerState & AudioPlayerAction;
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
	playbackQuality: "Auto",
	playTalkTrack: false,
	playInstrumental: false,
	stopAfterMusicCount: null,
};

function getNextIndex(
	index: number,
	queueLength: number,
	repeatMode: AudioPlayerState["repeatMode"],
	shuffle: boolean,
): number | null {
	if (queueLength === 0) return null;
	if (repeatMode === "one") return index;

	if (shuffle) {
		if (queueLength === 1) return repeatMode === "all" ? index : null;

		let nextIndex = Math.floor(Math.random() * queueLength);
		while (nextIndex === index) {
			nextIndex = Math.floor(Math.random() * queueLength);
		}

		return nextIndex;
	}

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
	shuffle: boolean,
	playTalkTrack: boolean,
	playInstrumental: boolean,
): number | null {
	if (playTalkTrack && playInstrumental)
		return getNextIndex(index, queue.length, repeatMode, shuffle);

	if (repeatMode === "one") {
		return shouldAutoSkipTrack(queue[index], playTalkTrack, playInstrumental)
			? null
			: index;
	}

	if (shuffle) {
		const candidates = queue
			.map((track, trackIndex) => ({ track, trackIndex }))
			.filter(
				({ track, trackIndex }) =>
					!shouldAutoSkipTrack(track, playTalkTrack, playInstrumental) &&
					trackIndex !== index,
			);
		if (candidates.length === 0) {
			return repeatMode === "all" &&
				!shouldAutoSkipTrack(queue[index], playTalkTrack, playInstrumental)
				? index
				: null;
		}

		return candidates[Math.floor(Math.random() * candidates.length)].trackIndex;
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

async function loadAndPlay(
	playbackQuality: AudioPlayerState["playbackQuality"],
	track: AudioPlayerTrack,
	options: { autoplay?: boolean; currentTime?: number } = {},
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
			console.log("[audio-player] loadAndPlay:play failed", error);
		}

		clearPendingLoad(requestId);
		useAudioPlayerStore.setState({
			status: autoplay && waveSurfer.isPlaying() ? "playing" : "paused",
		});
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
					const autoplay = options?.autoplay ?? waveSurfer.isPlaying();
					const seekToCurrentTime = () => {
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
							set({ status: "playing" });
						} catch (error) {
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
					set({ queue: album, index, status: "loading" });
					loadAndPlay(get().playbackQuality, track);
				},
				addToQueue: (track: AudioPlayerTrack[]) => {
					console.log("[audio-player] addToQueue", {
						trackCount: track.length,
					});

					set((state) => {
						const wasEmpty = state.queue.length === 0;
						state.queue.push(...track);

						if (wasEmpty) state.index = 0;
					});
				},
				addNextToQueue: (track: AudioPlayerTrack[]) => {
					console.log("[audio-player] addNextToQueue", {
						trackCount: track.length,
					});

					set((state) => {
						const wasEmpty = state.queue.length === 0;
						state.queue.splice(state.index + 1, 0, ...track);

						if (wasEmpty) state.index = 0;
					});
				},
				playQueueTrack: (index) => {
					const { playbackQuality, queue } = get();
					const track = queue.at(index);
					if (!track) return;

					set({ index, status: "loading" });
					loadAndPlay(playbackQuality, track);
				},
				playNext: () => {
					const { index, playbackQuality, queue, repeatMode, shuffle } = get();
					const nextRepeatMode = repeatMode === "one" ? "off" : repeatMode;
					const nextIndex = getNextIndex(
						index,
						queue.length,
						nextRepeatMode,
						shuffle,
					);
					if (nextIndex === null) return;

					const track = queue.at(nextIndex);
					if (!track) return;

					set({ index: nextIndex, status: "loading" });
					loadAndPlay(playbackQuality, track);
				},
				playPrev: () => {
					const { index, playbackQuality, queue, repeatMode } = get();
					const prevIndex = getPrevIndex(index, queue.length, repeatMode);
					if (prevIndex === null) return;

					const track = queue.at(prevIndex);
					if (!track) return;

					set({ index: prevIndex, status: "loading" });
					loadAndPlay(playbackQuality, track);
				},
				togglePlay: async () => {
					const { index, playbackQuality, queue, status } = get();
					const track = queue.at(index);
					if (!track || status === "loading") return;

					if (status === "playing") {
						waveSurfer?.pause();
						return;
					}

					if (status === "paused" || status === "ready") {
						try {
							await waveSurfer?.play();
							set({ status: "playing" });
						} catch (error) {
							console.log("[audio-player] togglePlay:play failed", error);
							await get().reloadAudio({ autoplay: true });
						}

						return;
					}

					set({ status: "loading" });
					loadAndPlay(playbackQuality, track);
				},
				pause: () => {
					waveSurfer?.pause();
					set((state) => {
						if (state.status === "playing") state.status = "paused";
					});
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
					const {
						index,
						playbackQuality,
						playTalkTrack,
						playInstrumental,
						queue,
						repeatMode,
						shuffle,
						stopAfterMusicCount,
					} = get();

					if (queue.length === 0) {
						console.log("[audio-player] markFinished:empty queue");
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

					const nextIndex = getNextAutoIndex(
						index,
						queue,
						repeatMode,
						shuffle,
						playTalkTrack,
						playInstrumental,
					);
					if (nextIndex === null) {
						console.log("[audio-player] markFinished:end of queue");
						resetWaveSurferToIdle();
						set({ currentPlayingKey: null, status: "idle" });
						return;
					}

					const track = queue.at(nextIndex);
					if (!track) {
						console.log("[audio-player] markFinished:end of queue");
						resetWaveSurferToIdle();
						set({ currentPlayingKey: null, status: "idle" });
						return;
					}

					console.log("[audio-player] markFinished:next", {
						index: nextIndex,
						trackId: track.trackId,
						title: track.title,
					});

					set({ index: nextIndex, status: "loading" });
					loadAndPlay(playbackQuality, track);
				},
			})),
			{
				name: "audio-player-settings",
				storage: createJSONStorage(() => localStorage),
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
