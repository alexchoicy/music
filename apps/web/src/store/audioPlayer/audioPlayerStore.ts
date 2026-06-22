import type WaveSurfer from "wavesurfer.js";
import type { WaveSurferOptions } from "wavesurfer.js";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { isProbablyPhone } from "#/lib/utils/browser";

import { getPresignedUrl, getWaveformData } from "./audioPlayerFunction";
import type {
	AudioPlayerAction,
	AudioPlayerState,
	AudioPlayerTrack,
} from "./audioPlayerType";

type AudioPlayerStore = AudioPlayerState & AudioPlayerAction;
type AudioPlayerPersistedState = Pick<
	AudioPlayerState,
	| "volume"
	| "muted"
	| "repeatMode"
	| "shuffle"
	| "playbackQuality"
	| "playTalkTrack"
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
	volume: 1,
	muted: false,
	hidden: false,
	repeatMode: "off",
	shuffle: false,
	playbackQuality: "Auto",
	playTalkTrack: false,
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

function getNextAutoIndex(
	index: number,
	queue: AudioPlayerTrack[],
	repeatMode: AudioPlayerState["repeatMode"],
	shuffle: boolean,
	playTalkTrack: boolean,
): number | null {
	if (playTalkTrack)
		return getNextIndex(index, queue.length, repeatMode, shuffle);

	if (repeatMode === "one") {
		return queue[index]?.contentType === "MC" ? null : index;
	}

	if (shuffle) {
		const candidates = queue
			.map((track, trackIndex) => ({ track, trackIndex }))
			.filter(
				({ track, trackIndex }) =>
					track.contentType !== "MC" && trackIndex !== index,
			);
		if (candidates.length === 0) return null;

		return candidates[Math.floor(Math.random() * candidates.length)].trackIndex;
	}

	for (let offset = 1; offset < queue.length; offset++) {
		const nextIndex = index + offset;
		if (nextIndex >= queue.length) break;
		if (queue[nextIndex]?.contentType !== "MC") return nextIndex;
	}

	if (repeatMode !== "all") return null;

	for (let nextIndex = 0; nextIndex < index; nextIndex++) {
		if (queue[nextIndex]?.contentType !== "MC") return nextIndex;
	}

	return null;
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

export function autoSelectPlaybackQuality(): AudioPlayerState["playbackQuality"] {
	return isProbablyPhone() ? "Opus96" : "Original";
}

async function loadAndPlay(
	playbackQuality: AudioPlayerState["playbackQuality"],
	track: AudioPlayerTrack,
	options: { autoplay?: boolean; currentTime?: number } = {},
): Promise<void> {
	const autoplay = options.autoplay ?? true;
	const requestId = ++loadRequestId;
	finishedRequestId = requestId;
	console.log("[audio-player] loadAndPlay:start", {
		autoplay,
		playbackQuality,
		requestId,
		trackId: track.trackId,
		title: track.title,
	});

	if (!waveSurfer) {
		console.log("[audio-player] loadAndPlay:no WaveSurfer instance");
		useAudioPlayerStore.setState({ status: "idle" });
		return;
	}
	prepareWaveSurferForLoad();

	const selectedQuality =
		playbackQuality === "Auto" ? autoSelectPlaybackQuality() : playbackQuality;
	const playbackUrl =
		selectedQuality === "Original"
			? track.audio.file.original.url
			: (track.audio.file.opus96?.url ?? track.audio.file.original.url);

	const [playUrl, waveformData] = await Promise.all([
		getPresignedUrl(playbackUrl),
		track.audio.file.waveformB8Pixel20
			? getWaveformData(track.audio.file.waveformB8Pixel20.url)
			: Promise.resolve(null),
	]);

	if (requestId !== loadRequestId) {
		console.log("[audio-player] loadAndPlay:stale before load", {
			requestId,
		});
		return;
	}

	if (!playUrl) {
		console.log("[audio-player] loadAndPlay:load failed", {
			playbackUrl,
			requestId,
			trackId: track.trackId,
		});
		resetWaveSurferToIdle();
		useAudioPlayerStore.setState({ status: "idle" });
		return;
	}

	console.log("[audio-player] loadAndPlay:load", {
		playbackUrl,
		requestId,
		trackId: track.trackId,
		withWaveform: Boolean(waveformData),
	});

	try {
		if (waveformData) {
			await waveSurfer.load(playUrl, [waveformData], track.durationInMs / 1000);
		} else {
			await waveSurfer.load(playUrl);
		}
	} catch (error) {
		if (requestId !== loadRequestId) return;

		console.log("[audio-player] loadAndPlay:load failed", error);
		resetWaveSurferToIdle();
		useAudioPlayerStore.setState({ status: "idle" });
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
		finishedRequestId = 0;
		waveSurfer.toggleInteraction(true);
		useAudioPlayerStore.setState({ status: "paused" });
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
		resetWaveSurferToIdle();
		useAudioPlayerStore.setState({ status: "idle" });
		return;
	}

	console.log("[audio-player] loadAndPlay:playing", {
		requestId,
		trackId: track.trackId,
	});
	finishedRequestId = 0;
	useAudioPlayerStore.setState({ status: "playing" });
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
				addToQueue: (track: AudioPlayerTrack) => {
					console.log("[audio-player] addToQueue", {
						trackId: track.trackId,
						title: track.title,
					});

					set((state) => {
						const wasEmpty = state.queue.length === 0;
						state.queue.push(track);

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
					const nextIndex = getNextIndex(
						index,
						queue.length,
						repeatMode,
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
					const { index, queue, status } = get();
					if (playbackQuality === get().playbackQuality) return;

					const track = queue.at(index);
					if (!track || status === "idle") {
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
				markReady: () => {
					set((state) => {
						if (state.status === "loading") state.status = "ready";
					});
				},
				markPlaying: (playing) => {
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
						queue,
						repeatMode,
						shuffle,
					} = get();

					if (queue.length === 0) {
						console.log("[audio-player] markFinished:empty queue");
						resetWaveSurferToIdle();
						set({ status: "idle" });
						return;
					}

					const nextIndex = getNextAutoIndex(
						index,
						queue,
						repeatMode,
						shuffle,
						playTalkTrack,
					);
					if (nextIndex === null) {
						console.log("[audio-player] markFinished:end of queue");
						resetWaveSurferToIdle();
						set({ status: "idle" });
						return;
					}

					const track = queue.at(nextIndex);
					if (!track) {
						console.log("[audio-player] markFinished:end of queue");
						resetWaveSurferToIdle();
						set({ status: "idle" });
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
				}),
			},
		),
	),
);
