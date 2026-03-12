import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useEffectEvent,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { toast } from "sonner";
import WaveSurfer from "wavesurfer.js";
import type { AudioWaveformJson } from "@/data/AudioWaveForm";
import type { AudioPlayerItem, RepeatMode } from "@/models/audioPlayer";

async function resolvePlayUrl(requestUrl: string, signal: AbortSignal) {
	try {
		const response = await fetch(requestUrl, {
			method: "GET",
			credentials: "include",
			signal,
		});

		if (!response.ok) {
			throw new Error(`Failed to resolve play url: ${response.status}`);
		}

		const rawBody = (await response.text()).trim();
		return rawBody.length > 0 ? rawBody : requestUrl;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		console.warn(
			"Failed to pre-resolve play url, fallback to endpoint:",
			error,
		);
		return requestUrl;
	}
}

async function getWaveformData(
	url: string,
	signal: AbortSignal,
): Promise<number[] | null> {
	try {
		const response = await fetch(url, {
			method: "GET",
			signal,
		});

		if (!response.ok) {
			return null;
		}

		const data: AudioWaveformJson = await response.json();
		return data.data;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		console.error("Error fetching waveform data:", error);
		return null;
	}
}

type AudioPlayerRefs = {
	audioRef: React.RefObject<HTMLMediaElement | null>;
	waveContainerRef: React.RefObject<HTMLDivElement | null>;
};

type AudioPlayerAvailability = {
	shouldHidePlayer: boolean;
	playlist: number[];
	cursor: number;
	currentTrack: AudioPlayerItem | null;
	hasPrev: boolean;
	hasNext: boolean;
};

type AudioPlayerStatus = {
	status: PlaybackStatus;
	isPlaying: boolean;
	repeatMode: RepeatMode;
};

type AudioPlayerVolume = {
	volume: number;
};

type AudioPlayerActions = {
	toggle: () => void;
	toggleRepeat: () => void;
	goPrev: () => void;
	goNext: () => void;
	playWithPlaylist: (items: AudioPlayerItem[]) => void;
	playWithPlaylistByTrackId: (
		items: AudioPlayerItem[],
		trackId: number,
	) => void;
	setVolume: (volume: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerRefs | null>(null);
const AudioPlayerAvailabilityContext =
	createContext<AudioPlayerAvailability | null>(null);
const AudioPlayerStatusContext = createContext<AudioPlayerStatus | null>(null);
const AudioPlayerVolumeContext = createContext<AudioPlayerVolume | null>(null);
const AudioPlayerActionsContext = createContext<AudioPlayerActions | null>(
	null,
);

type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

type PlayerState = {
	queue: AudioPlayerItem[];
	cursor: number;
	status: PlaybackStatus;
	volume: number;
	repeatMode: RepeatMode;
};

type Action =
	| { type: "NewPlayList"; items: AudioPlayerItem[]; trackId?: number }
	| { type: "Toggle" }
	| { type: "ToggleRepeat" }
	| { type: "GoPrev" }
	| { type: "GoNext" }
	| { type: "SetVolume"; volume: number }
	| { type: "SetStatus"; status: PlaybackStatus }
	| { type: "SetCursor"; cursor: number };

const initialState: PlayerState = {
	queue: [],
	cursor: 0,
	status: "idle",
	volume: 1,
	repeatMode: "off",
};

function playerReducer(state: PlayerState, action: Action): PlayerState {
	switch (action.type) {
		case "NewPlayList": {
			const { items, trackId } = action;
			const nextCursor =
				trackId == null
					? 0
					: Math.max(
							0,
							items.findIndex((item) => item.trackId === trackId),
						);

			return {
				...state,
				queue: items,
				cursor: nextCursor,
				status: items.length > 0 ? "loading" : "idle",
			};
		}
		case "Toggle": {
			if (state.queue.length === 0) {
				return state;
			}

			return {
				...state,
				status:
					state.status === "playing" || state.status === "loading"
						? "paused"
						: "loading",
			};
		}
		case "ToggleRepeat": {
			const nextMode: RepeatMode =
				state.repeatMode === "off"
					? "all"
					: state.repeatMode === "all"
						? "one"
						: "off";

			return {
				...state,
				repeatMode: nextMode,
			};
		}
		case "GoPrev": {
			const nextCursor = state.cursor - 1;
			if (nextCursor < 0) return state;

			const nextStatus =
				state.status === "playing" || state.status === "loading"
					? "loading"
					: "paused";

			return {
				...state,
				cursor: nextCursor,
				status: nextStatus,
			};
		}
		case "GoNext": {
			const nextCursor = state.cursor + 1;
			if (nextCursor >= state.queue.length) return state;

			const nextStatus =
				state.status === "playing" || state.status === "loading"
					? "loading"
					: "paused";

			return {
				...state,
				cursor: nextCursor,
				status: nextStatus,
			};
		}
		case "SetVolume": {
			const volume = Math.min(1, Math.max(0, action.volume));
			if (volume === state.volume) return state;
			return { ...state, volume };
		}
		case "SetStatus": {
			if (state.status === action.status) return state;
			return { ...state, status: action.status };
		}
		case "SetCursor": {
			if (action.cursor < 0 || action.cursor >= state.queue.length) {
				return state;
			}

			const nextStatus =
				state.status === "playing" || state.status === "loading"
					? "loading"
					: "paused";

			return {
				...state,
				cursor: action.cursor,
				status: nextStatus,
			};
		}
		default:
			return state;
	}
}

export function AudioPlayerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [state, dispatch] = useReducer(playerReducer, initialState);

	const stateRef = useRef(state);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const audioRef = useRef<HTMLMediaElement | null>(null);
	const waveContainerRef = useRef<HTMLDivElement | null>(null);
	const waveRef = useRef<WaveSurfer | null>(null);

	const audioPlayerRefsValue = useMemo<AudioPlayerRefs>(() => {
		return {
			audioRef,
			waveContainerRef,
		};
	}, []);

	const currentTrack = state.queue[state.cursor] ?? null;

	const playerAvailabilityValue = useMemo<AudioPlayerAvailability>(() => {
		return {
			shouldHidePlayer: state.queue.length === 0 || currentTrack == null,
			playlist: state.queue.map((item) => item.trackId),
			cursor: state.cursor,
			currentTrack,
			hasPrev: state.cursor > 0,
			hasNext: state.cursor < state.queue.length - 1,
		};
	}, [state.queue, state.cursor, currentTrack]);

	const playerStatusValue = useMemo<AudioPlayerStatus>(() => {
		return {
			status: state.status,
			isPlaying: state.status === "playing" || state.status === "loading",
			repeatMode: state.repeatMode,
		};
	}, [state.status, state.repeatMode]);

	const playerVolumeValue = useMemo<AudioPlayerVolume>(() => {
		return {
			volume: state.volume,
		};
	}, [state.volume]);

	const toggle = useCallback(() => {
		dispatch({ type: "Toggle" });
	}, []);

	const toggleRepeat = useCallback(() => {
		dispatch({ type: "ToggleRepeat" });
	}, []);

	const goPrev = useCallback(() => {
		dispatch({ type: "GoPrev" });
	}, []);

	const goNext = useCallback(() => {
		dispatch({ type: "GoNext" });
	}, []);

	const playWithPlaylist = useCallback((items: AudioPlayerItem[]) => {
		dispatch({ type: "NewPlayList", items });
	}, []);

	const playWithPlaylistByTrackId = useCallback(
		(items: AudioPlayerItem[], trackId: number) => {
			dispatch({ type: "NewPlayList", items, trackId });
		},
		[],
	);

	const setVolume = useCallback((volume: number) => {
		dispatch({ type: "SetVolume", volume });
	}, []);

	const playerActionsValue = useMemo<AudioPlayerActions>(() => {
		return {
			toggle,
			toggleRepeat,
			goPrev,
			goNext,
			playWithPlaylist,
			playWithPlaylistByTrackId,
			setVolume,
		};
	}, [
		toggle,
		toggleRepeat,
		goPrev,
		goNext,
		playWithPlaylist,
		playWithPlaylistByTrackId,
		setVolume,
	]);

	useEffect(() => {
		if (!audioRef.current || !waveContainerRef.current || waveRef.current) {
			return;
		}

		const wave = WaveSurfer.create({
			container: waveContainerRef.current,
			media: audioRef.current,
			height: 32,
			normalize: true,
			dragToSeek: true,
		});

		waveRef.current = wave;

		return () => {
			wave.destroy();
			waveRef.current = null;
		};
	}, []);

	const onPlay = useEffectEvent(() => {
		dispatch({ type: "SetStatus", status: "playing" });
	});

	const onPause = useEffectEvent(() => {
		const audioElement = audioRef.current;
		if (!audioElement || audioElement.ended) return;

		const currentStatus = stateRef.current.status;
		if (currentStatus === "idle" || currentStatus === "loading") {
			return;
		}

		dispatch({ type: "SetStatus", status: "paused" });
	});

	const onEnded = useEffectEvent(() => {
		const audioElement = audioRef.current;
		if (!audioElement) return;

		const snapshot = stateRef.current;

		if (snapshot.queue.length === 0) {
			dispatch({ type: "SetStatus", status: "paused" });
			return;
		}

		if (snapshot.repeatMode === "one") {
			audioElement.currentTime = 0;
			dispatch({ type: "SetStatus", status: "loading" });
			return;
		}

		if (snapshot.repeatMode === "all") {
			dispatch({
				type: "SetCursor",
				cursor: (snapshot.cursor + 1) % snapshot.queue.length,
			});
			return;
		}

		if (snapshot.cursor + 1 < snapshot.queue.length) {
			dispatch({ type: "GoNext" });
			return;
		}

		dispatch({ type: "SetStatus", status: "paused" });
	});

	const onError = useEffectEvent(() => {
		console.warn("Audio playback error, skipping to next track");

		const snapshot = stateRef.current;
		if (snapshot.cursor + 1 < snapshot.queue.length) {
			dispatch({ type: "GoNext" });
			return;
		}

		dispatch({ type: "SetStatus", status: "paused" });
	});

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) return;

		audioElement.addEventListener("play", onPlay);
		audioElement.addEventListener("pause", onPause);
		audioElement.addEventListener("ended", onEnded);
		audioElement.addEventListener("error", onError);

		return () => {
			audioElement.removeEventListener("play", onPlay);
			audioElement.removeEventListener("pause", onPause);
			audioElement.removeEventListener("ended", onEnded);
			audioElement.removeEventListener("error", onError);
		};
	}, []);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) return;

		audioElement.volume = state.volume;
	}, [state.volume]);

	const loadRequestRef = useRef(0);
	const playRequestRef = useRef(0);
	const loadedTrackIdRef = useRef<number | null>(null);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) return;

		const requestId = loadRequestRef.current + 1;
		loadRequestRef.current = requestId;
		loadedTrackIdRef.current = null;

		const controller = new AbortController();

		if (!currentTrack) {
			audioElement.pause();
			audioElement.removeAttribute("src");
			audioElement.load();
			return () => {
				controller.abort();
			};
		}

		const source = currentTrack.sources[0];

		if (!source) {
			toast.error(`No source found for track:${currentTrack.albumTitle}`);

			if (state.cursor + 1 < state.queue.length) {
				dispatch({ type: "GoNext" });
			} else {
				dispatch({ type: "SetStatus", status: "paused" });
			}

			return () => {
				controller.abort();
			};
		}

		const loadTrack = async () => {
			try {
				const waveformUrl = source.file.waveformB8Pixel20?.url;

				const [playUrl, waveformData] = await Promise.all([
					resolvePlayUrl(source.file.original.url, controller.signal),
					waveformUrl
						? getWaveformData(waveformUrl, controller.signal)
						: Promise.resolve(null),
				]);

				if (controller.signal.aborted || loadRequestRef.current !== requestId) {
					return;
				}

				audioElement.pause();
				audioElement.currentTime = 0;
				audioElement.src = playUrl;
				audioElement.load();

				if (waveRef.current) {
					if (waveformData && currentTrack.durationInMs > 0) {
						await waveRef.current.load(
							playUrl,
							[waveformData],
							currentTrack.durationInMs / 1000,
						);
					} else {
						await waveRef.current.load(playUrl);
					}
				}

				if (controller.signal.aborted || loadRequestRef.current !== requestId) {
					return;
				}
				loadedTrackIdRef.current = currentTrack.trackId;

				const latestStatus = stateRef.current.status;
				if (latestStatus === "loading" || latestStatus === "playing") {
					const playRequestId = playRequestRef.current + 1;
					playRequestRef.current = playRequestId;

					audioElement.play().catch((error) => {
						if (playRequestRef.current !== playRequestId) return;

						if (error instanceof DOMException && error.name === "AbortError") {
							return;
						}

						console.error("play failed:", error);
						toast.error(`Failed to play track:${currentTrack.albumTitle}`);

						dispatch({ type: "SetStatus", status: "paused" });
					});
				}
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				console.warn("Failed to load track, skipping to next track", error);

				const snapshot = stateRef.current;
				if (snapshot.cursor + 1 < snapshot.queue.length) {
					dispatch({ type: "GoNext" });
				} else {
					dispatch({ type: "SetStatus", status: "paused" });
				}
			}
		};
		void loadTrack();

		return () => {
			controller.abort();
		};
	}, [currentTrack, state.cursor, state.queue.length]);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement || !currentTrack) return;

		if (loadedTrackIdRef.current !== currentTrack.trackId) {
			return;
		}

		if (state.status === "paused" || state.status === "idle") {
			playRequestRef.current += 1;
			if (!audioElement.paused) {
				audioElement.pause();
			}
			return;
		}

		if (state.status === "loading" || state.status === "playing") {
			if (!audioElement.paused) return;

			const playRequestId = playRequestRef.current + 1;
			playRequestRef.current = playRequestId;

			audioElement.play().catch((error) => {
				if (playRequestRef.current !== playRequestId) return;

				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				console.error("play failed:", error);
				dispatch({ type: "SetStatus", status: "paused" });
			});
		}
	}, [currentTrack, state.status]);

	return (
		<AudioPlayerContext value={audioPlayerRefsValue}>
			<AudioPlayerAvailabilityContext value={playerAvailabilityValue}>
				<AudioPlayerStatusContext value={playerStatusValue}>
					<AudioPlayerVolumeContext value={playerVolumeValue}>
						<AudioPlayerActionsContext value={playerActionsValue}>
							{children}
							<audio ref={audioRef} preload="metadata">
								<track kind="captions" />
							</audio>
						</AudioPlayerActionsContext>
					</AudioPlayerVolumeContext>
				</AudioPlayerStatusContext>
			</AudioPlayerAvailabilityContext>
		</AudioPlayerContext>
	);
}

export function useAudioPlayerRefs() {
	const ctx = useContext(AudioPlayerContext);
	if (!ctx)
		throw new Error(
			"useAudioPlayerRefs must be used inside <AudioPlayerProvider />",
		);
	return ctx;
}

export function useAudioPlayerAvailability() {
	const ctx = useContext(AudioPlayerAvailabilityContext);
	if (!ctx)
		throw new Error(
			"useAudioPlayerAvailability must be used inside <AudioPlayerProvider />",
		);
	return ctx;
}

export function useAudioPlayerStatus() {
	const ctx = useContext(AudioPlayerStatusContext);
	if (!ctx)
		throw new Error(
			"useAudioPlayerStatus must be used inside <AudioPlayerProvider />",
		);
	return ctx;
}

export function useAudioPlayerVolume() {
	const ctx = useContext(AudioPlayerVolumeContext);
	if (!ctx)
		throw new Error(
			"useAudioPlayerVolume must be used inside <AudioPlayerProvider />",
		);
	return ctx;
}

export function useAudioPlayerActions() {
	const ctx = useContext(AudioPlayerActionsContext);
	if (!ctx)
		throw new Error(
			"useAudioPlayerActions must be used inside <AudioPlayerProvider />",
		);
	return ctx;
}
