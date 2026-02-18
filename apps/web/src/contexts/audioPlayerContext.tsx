import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import WaveSurfer from "wavesurfer.js";
import type { AudioPlayerItem } from "@/models/audioPlayer";

type AudioPlayerApi = {
	audioRef: React.RefObject<HTMLMediaElement | null>;
	waveContainerRef: React.RefObject<HTMLDivElement | null>;

	trackInfo: Record<number, AudioPlayerItem>;
	playlist: number[];
	cursor: number;
	currentTrack: AudioPlayerItem | null;
	isPrev: boolean;
	isNext: boolean;
	isPlaying: boolean;
	toggle: () => Promise<void>;
	goPrev: () => void;
	goNext: () => void;
	playWithPlaylist: (items: AudioPlayerItem[]) => void;
	playWithPlaylistByTrackId: (
		items: AudioPlayerItem[],
		trackId: number,
	) => void;
};

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

export function AudioPlayerProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const audioRef = useRef<HTMLMediaElement | null>(null);
	const waveContainerRef = useRef<HTMLDivElement | null>(null);
	const waveRef = useRef<WaveSurfer | null>(null);

	const [isPlaying, setIsPlaying] = useState(false);

	// trackId -> trackInfo
	const [trackInfo, setTrackInfo] = useState<Record<number, AudioPlayerItem>>(
		{},
	);
	// order of playlist by trackIds
	const [playlist, setPlaylist] = useState<number[]>([]);

	// current index in the playlist
	const [cursor, setCursor] = useState<number>(0);

	const playlistRef = useRef<number[]>([]);
	const currentPlayingUrlRef = useRef<string>("");
	const isPlayingRef = useRef<boolean>(isPlaying);

	useEffect(() => {
		playlistRef.current = playlist;
	}, [playlist]);

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	useEffect(() => {
		if (!audioRef.current || !waveContainerRef.current) return;

		if (waveRef.current) return;

		const ws = WaveSurfer.create({
			container: waveContainerRef.current,
			backend: "MediaElement",
			media: audioRef.current,
			height: 32,
			normalize: true,
			dragToSeek: true,
			// fetchParams: { credentials: "include" },
		});

		waveRef.current = ws;

		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);

		const onFinish = () => {
			setCursor((prev) => {
				const len = playlistRef.current.length;
				if (len === 0) return 0;
				console.log(
					"track finished, playlist length:",
					len,
					"current cursor:",
					prev,
				);
				if (prev < len - 1) return prev + 1;
				console.log("playlist finished");
				setIsPlaying(false);
				return prev;
			});
		};

		ws.on("play", onPlay);
		ws.on("pause", onPause);
		ws.on("finish", onFinish);

		return () => {
			ws.un("play", onPlay);
			ws.un("pause", onPause);
			ws.un("finish", onFinish);

			ws.destroy();
			waveRef.current = null;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		const controller = new AbortController();

		const run = async () => {
			const audioElement = audioRef.current;
			if (!audioElement) return;

			const currentTrackId = playlist[cursor];
			const currentTrack = trackInfo[currentTrackId];
			if (!currentTrack) return;

			const source = currentTrack.sources[0]; //TODO: check if backend handled the order by pinned + rank
			if (!source) {
				console.warn("No source found for track:", currentTrack);
				setCursor((prev) => prev + 1);
				return;
			}

			const requestUrl = `${source.file.original.url}`;
			let playUrl = requestUrl;

			try {
				const response = await fetch(requestUrl, {
					method: "GET",
					credentials: "include",
					signal: controller.signal,
				});

				if (!response.ok) {
					throw new Error(`Failed to resolve play url: ${response.status}`);
				}

				const rawBody = (await response.text()).trim();
				if (rawBody.length > 0) {
					playUrl =
						rawBody.startsWith('"') && rawBody.endsWith('"')
							? rawBody.slice(1, -1)
							: rawBody;
				}
			} catch (e) {
				if (!cancelled) {
					console.warn(
						"Failed to pre-resolve play url, fallback to endpoint:",
						e,
					);
				}
			}

			if (cancelled) return;

			console.log("resolved play url:", playUrl);

			if (currentPlayingUrlRef.current !== playUrl) {
				currentPlayingUrlRef.current = playUrl;

				audioElement.src = playUrl;
				// audioElement.load();

				// TODO:!!!! this things will request the file again, create the peak data when upload. "audiowaveform"
				waveRef.current?.load(playUrl);
			}

			if (isPlayingRef.current) {
				try {
					await audioElement.play();
				} catch (e) {
					console.error("audio play failed:", e);
					setIsPlaying(false);
				}
			}
		};

		run();

		return () => {
			cancelled = true;
			controller.abort();
		};
	}, [trackInfo, playlist, cursor]);

	useEffect(() => {
		const audioElement = audioRef.current;
		if (!audioElement) return;

		if (isPlaying) {
			audioElement.play().catch((e) => {
				console.error("play failed:", e);
				setIsPlaying(false);
			});
		} else {
			audioElement.pause();
		}
	}, [isPlaying]);

	const api = useMemo(() => {
		const currentTrackId = playlist[cursor];
		const currentTrack =
			typeof currentTrackId === "number" ? trackInfo[currentTrackId] : null;
		const isPrev = playlist.length > 0 && cursor > 0;
		const isNext = playlist.length > 0 && cursor < playlist.length - 1;

		return {
			audioRef,
			waveContainerRef,

			isPlaying,
			trackInfo,
			playlist,
			cursor,
			currentTrack,
			isPrev,
			isNext,

			addToPlaylist: (item: AudioPlayerItem) => {
				setTrackInfo((prev) => ({ ...prev, [item.trackId]: item }));
				setPlaylist((prev) => [...prev, item.trackId]);
			},

			playWithPlaylist: (items: AudioPlayerItem[]) => {
				setPlaylist(items.map((i) => i.trackId));
				setTrackInfo(Object.fromEntries(items.map((i) => [i.trackId, i])));
				setCursor(0);
				setIsPlaying(true);

				console.log("playWithPlaylist:");
			},

			playWithPlaylistByTrackId: (
				items: AudioPlayerItem[],
				trackId: number,
			) => {
				setPlaylist(items.map((i) => i.trackId));
				setTrackInfo(Object.fromEntries(items.map((i) => [i.trackId, i])));
				setCursor(items.findIndex((i) => i.trackId === trackId));
				setIsPlaying(true);

				console.log("playWithPlaylistByTrackId:", {
					trackId,
					foundIndex: items.findIndex((i) => i.trackId === trackId),
				});
			},

			toggle: async () => {
				const a = audioRef.current;
				if (!a) return;
				if (a.paused) {
					try {
						await a.play();
					} catch (e) {
						console.error("toggle play failed:", e);
					}
				} else {
					a.pause();
				}
			},

			goPrev: () => {
				if (!isPrev) return;
				setCursor((prev) => Math.max(0, prev - 1));
			},

			goNext: () => {
				if (!isNext) return;
				setCursor((prev) => Math.min(playlist.length - 1, prev + 1));
			},
		};
	}, [isPlaying, cursor, trackInfo, playlist]);

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
