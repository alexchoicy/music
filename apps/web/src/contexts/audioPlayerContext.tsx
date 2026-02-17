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
	isPlaying: boolean;
	toggle: () => Promise<void>;
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

	const [currentTime, setCurrentTime] = useState(0);

	const playlistRef = useRef<number[]>([]);
	const isPlayingRef = useRef<boolean>(false);

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
			height: 64,
			normalize: true,
			dragToSeek: true,
			fetchParams: { credentials: "include" },
		});

		waveRef.current = ws;

		const onPlay = () => setIsPlaying(true);
		const onPause = () => setIsPlaying(false);

		const onFinish = () => {
			setCursor((prev) => {
				const len = playlistRef.current.length;
				if (len === 0) return 0;
				if (prev < len - 1) return prev + 1;
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
		const currentTrackId = playlist[cursor];
		const currentTrack = trackInfo[currentTrackId];
		if (!currentTrack) return;

		const source = currentTrack.sources[0]; //TODO: check if backend handled the order by pinned + rank
		if (!source) {
			console.warn("No source found for track:", currentTrack);
			setCursor((prev) => prev + 1);
			return;
		}

		const url = `${source.file.original.url}/play`;
	}, [trackInfo, playlist, cursor]);

	const api = useMemo(() => {
		return {
			audioRef,
			waveContainerRef,

			isPlaying,
			trackInfo,
			playlist,
			cursor,

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
