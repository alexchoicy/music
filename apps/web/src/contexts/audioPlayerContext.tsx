import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import WaveSurfer from "wavesurfer.js";
import type { AudioWaveformJson } from "@/data/AudioWaveForm";
import type { AudioPlayerItem, RepeatMode } from "@/models/audioPlayer";

type AudioPlayerApi = {
	audioRef: React.RefObject<HTMLMediaElement | null>;
	waveContainerRef: React.RefObject<HTMLDivElement | null>;
	shouldHidePlayer: boolean;
	playlist: number[];
	cursor: number;
	currentTrack: AudioPlayerItem | null;
	isPrev: boolean;
	isNext: boolean;
	isPlaying: boolean;
	currentTime: number;
	toggle: () => Promise<void>;
	toggleRepeat: () => void;
	goPrev: () => void;
	goNext: () => void;
	playWithPlaylist: (items: AudioPlayerItem[]) => void;
	playWithPlaylistByTrackId: (
		items: AudioPlayerItem[],
		trackId: number,
	) => void;
	setRepeatMode?: (mode: RepeatMode) => void;
	repeatMode?: RepeatMode;
	volume: number;
	setVolume: (volume: number) => void;
};

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

type PlaybackStatus = "idle" | "loading" | "playing" | "paused";

function getTrackChangeStatus(status: PlaybackStatus): PlaybackStatus {
	return status === "playing" || status === "loading" ? "loading" : "paused";
}

function getInitialCursor(items: AudioPlayerItem[], trackId?: number) {
	if (items.length === 0) {
		return 0;
	}

	if (trackId == null) {
		return 0;
	}

	const matchedIndex = items.findIndex((item) => item.trackId === trackId);
	return matchedIndex >= 0 ? matchedIndex : 0;
}

export function AudioPlayerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const audioRef = useRef<HTMLMediaElement | null>(null);
	const waveContainerRef = useRef<HTMLDivElement | null>(null);
	const waveRef = useRef<WaveSurfer | null>(null);

	// simple race guard thingy
	const loadRequestRef = useRef(0);
	const playRequestRef = useRef(0);

	const [queue, setQueue] = useState<AudioPlayerItem[]>([]);
	const [cursor, setCursor] = useState(0);
	const [status, setStatus] = useState<PlaybackStatus>("idle");
	const [readyCursor, setReadyCursor] = useState<number | null>(null);
	const [currentTime, setCurrentTime] = useState(0);
	const [volume, setVolume] = useState(1);
	const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");

	const currentTrack = queue[cursor] ?? null;
	const isPlaying = status === "playing" || status === "loading";
	const shouldHidePlayer = queue.length === 0 || currentTrack == null;
	const isPrev = cursor > 0;
	const isNext = cursor < queue.length - 1;

	const playlist = useMemo(() => {
		return queue.map((item) => item.trackId);
	}, [queue]);

	const setVolumeClamped = useCallback((nextVolume: number) => {
		setVolume(Math.min(1, Math.max(0, nextVolume)));
	}, []);

	const moveToCursor = useCallback(
		(nextCursor: number) => {
			if (nextCursor < 0 || nextCursor >= queue.length) {
				return false;
			}

			setCursor(nextCursor);
			setCurrentTime(0);
			setReadyCursor(null);
			setStatus((prev) => {
				return getTrackChangeStatus(prev);
			});
			return true;
		},
		[queue.length],
	);

	const autoSkipToNextTrack = useCallback(() => {
		switch (repeatMode) {
			case "off":
				return moveToCursor(cursor + 1);
			case "one": {
				const audioElement = audioRef.current;
				if (!audioElement) {
					return false;
				}
				audioElement.currentTime = 0;
				setCurrentTime(0);
				setStatus("loading");
				return true;
			}
			case "all":
				moveToCursor((cursor + 1) % queue.length);
				return true;
		}
	}, [cursor, queue.length, repeatMode, moveToCursor]);

	const skipToNextTrack = useCallback(() => {
		return moveToCursor(cursor + 1);
	}, [cursor, moveToCursor]);

	const startPlaylist = useCallback(
		(items: AudioPlayerItem[], trackId?: number) => {
			const nextCursor = getInitialCursor(items, trackId);

			setQueue(items);
			setCursor(nextCursor);
			setCurrentTime(0);
			setReadyCursor(null);
			setStatus(items.length > 0 ? "loading" : "idle");
		},
		[],
	);

	const resolvePlayUrl = useCallback(
		async (requestUrl: string, signal: AbortSignal) => {
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
		},
		[],
	);

	const getWaveFormData = useCallback(
		async (url: string, signal: AbortSignal): Promise<number[] | null> => {
			try {
				const response = await fetch(url, {
					method: "GET",
					signal,
				});

				if (!response.ok) {
					return null;
				}

				const responseData: AudioWaveformJson = await response.json();
				return responseData.data;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					throw error;
				}

				console.error("Error fetching waveform data:", error);
				return null;
			}
		},
		[],
	);

	const toggle = useCallback(async () => {
		if (!currentTrack) {
			return;
		}

		setStatus((previousStatus) => {
			if (previousStatus === "playing" || previousStatus === "loading") {
				return "paused";
			}

			return "loading";
		});
	}, [currentTrack]);

	const toggleRepeat = useCallback(() => {
		setRepeatMode((prevMode) => {
			switch (prevMode) {
				case "off":
					return "all";
				case "all":
					return "one";
				case "one":
					return "off";
			}
		});
	}, []);

	const goPrev = useCallback(() => {
		void moveToCursor(cursor - 1);
	}, [cursor, moveToCursor]);

	const goNext = useCallback(() => {
		void moveToCursor(cursor + 1);
	}, [cursor, moveToCursor]);

	const playWithPlaylist = useCallback(
		(items: AudioPlayerItem[]) => {
			startPlaylist(items);
		},
		[startPlaylist],
	);

	const playWithPlaylistByTrackId = useCallback(
		(items: AudioPlayerItem[], trackId: number) => {
			startPlaylist(items, trackId);
		},
		[startPlaylist],
	);

	useEffect(() => {
		const audioElement = audioRef.current;
		const waveContainer = waveContainerRef.current;

		if (!audioElement || !waveContainer || waveRef.current) {
			return;
		}

		const wave = WaveSurfer.create({
			container: waveContainer,
			backend: "MediaElement",
			media: audioElement,
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

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) {
			return;
		}

		const handlePlay = () => {
			setStatus("playing");
		};

		const handleTimeUpdate = () => {
			setCurrentTime(audioElement.currentTime);
		};

		const handlePause = () => {
			if (audioElement.ended) {
				return;
			}

			setStatus((previousStatus) => {
				if (previousStatus === "idle" || previousStatus === "loading") {
					return previousStatus;
				}

				return "paused";
			});
		};

		const handleEnded = () => {
			if (!autoSkipToNextTrack()) {
				setStatus("paused");
			}
		};

		const handleError = () => {
			console.warn("Audio playback error, skipping to next track");
			if (!skipToNextTrack()) {
				setStatus("paused");
			}
		};

		audioElement.addEventListener("play", handlePlay);
		audioElement.addEventListener("pause", handlePause);
		audioElement.addEventListener("timeupdate", handleTimeUpdate);
		audioElement.addEventListener("ended", handleEnded);
		audioElement.addEventListener("error", handleError);

		return () => {
			audioElement.removeEventListener("play", handlePlay);
			audioElement.removeEventListener("pause", handlePause);
			audioElement.removeEventListener("timeupdate", handleTimeUpdate);
			audioElement.removeEventListener("ended", handleEnded);
			audioElement.removeEventListener("error", handleError);
		};
	}, [skipToNextTrack, autoSkipToNextTrack]);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) {
			return;
		}

		audioElement.volume = volume;
	}, [volume]);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) {
			return;
		}

		const requestId = loadRequestRef.current + 1;
		loadRequestRef.current = requestId;

		const controller = new AbortController();
		const source = currentTrack?.sources[0];

		if (!currentTrack) {
			audioElement.pause();
			setCurrentTime(0);
			setReadyCursor(null);
			return () => {
				controller.abort();
			};
		}

		audioElement.pause();

		if (!source) {
			console.warn("No source found for track:", currentTrack);
			if (!skipToNextTrack()) {
				setStatus("paused");
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
						? getWaveFormData(waveformUrl, controller.signal)
						: Promise.resolve(null),
				]);

				if (controller.signal.aborted || loadRequestRef.current !== requestId) {
					return;
				}

				audioElement.currentTime = 0;
				setCurrentTime(0);
				audioElement.src = playUrl;
				audioElement.load();

				if (waveformData) {
					waveRef.current?.load(
						playUrl,
						[waveformData],
						currentTrack.durationInMs / 1000,
					);
				} else {
					waveRef.current?.load(playUrl);
				}

				setReadyCursor(cursor);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				console.warn("Failed to load track, skipping to next track", error);
				if (!skipToNextTrack()) {
					setStatus("paused");
				}
			}
		};
		void loadTrack();

		return () => {
			controller.abort();
		};
	}, [currentTrack, cursor, getWaveFormData, resolvePlayUrl, skipToNextTrack]);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) {
			return;
		}

		if (!currentTrack || readyCursor !== cursor) {
			playRequestRef.current += 1;
			return;
		}

		if (status === "loading" || status === "playing") {
			if (!audioElement.paused) {
				return;
			}

			const playRequestId = playRequestRef.current + 1;
			playRequestRef.current = playRequestId;

			audioElement.play().catch((error) => {
				if (playRequestRef.current !== playRequestId) {
					return;
				}

				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				console.error("play failed:", error);
				setStatus((previousStatus) => {
					if (previousStatus === "loading" || previousStatus === "playing") {
						return "paused";
					}

					return previousStatus;
				});
			});
			return;
		}

		playRequestRef.current += 1;
		audioElement.pause();
	}, [currentTrack, cursor, readyCursor, status]);

	const api = useMemo<AudioPlayerApi>(() => {
		return {
			audioRef,
			waveContainerRef,
			shouldHidePlayer,
			playlist,
			cursor,
			currentTrack,
			isPrev,
			isNext,
			isPlaying,
			currentTime,
			volume,
			setVolume: setVolumeClamped,
			toggle,
			toggleRepeat,
			goPrev,
			goNext,
			playWithPlaylist,
			playWithPlaylistByTrackId,
			repeatMode,
			setRepeatMode,
		};
	}, [
		currentTrack,
		cursor,
		goNext,
		goPrev,
		isNext,
		isPlaying,
		isPrev,
		currentTime,
		playWithPlaylist,
		playWithPlaylistByTrackId,
		playlist,
		setVolumeClamped,
		shouldHidePlayer,
		toggle,
		toggleRepeat,
		volume,
		repeatMode,
	]);

	return (
		<AudioPlayerContext.Provider value={api}>
			{children}
			<audio ref={audioRef} preload="metadata">
				<track kind="captions" />
			</audio>
		</AudioPlayerContext.Provider>
	);
}

export function useAudioPlayer() {
	const ctx = useContext(AudioPlayerContext);
	if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider />");
	return ctx;
}
