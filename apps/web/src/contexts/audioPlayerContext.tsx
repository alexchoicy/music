import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AudioPlayerItem } from "@/models/audioPlayer";

type AudioPlayerApi = {
	audioRef: React.RefObject<HTMLMediaElement | null>;
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

	useEffect(() => {
		const currentTrackId = playlist[cursor];
		const currentTrack = trackInfo[currentTrackId];
		if (!currentTrack) return;

		const source = currentTrack.sources[0]; //TODO: check if backend handled the order by pinned + rank
		if (!source) {
			console.warn("No source found for track:", currentTrack);
			setCursor((prev) => prev + 1); // skip to next track
			return;
		}

		audioRef.current!.src = `${source.file.original.url}/play`;
		audioRef.current!.play().catch((e) => {});
	}, [trackInfo, playlist, cursor]);

	const api = useMemo(() => {
		return {
			audioRef,
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
