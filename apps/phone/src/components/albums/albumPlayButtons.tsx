import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { PlayerTrack } from "@/lib/player/track";
import { usePlayerStore } from "@/store/playerStore";

type AlbumPlayButtonsProps = {
	albumId: string;
	/** Tracks that can play right now. */
	tracks: PlayerTrack[];
};

/** Shuffle and Play for an album; Play pauses when the album is already playing. */
export function AlbumPlayButtons({ albumId, tracks }: AlbumPlayButtonsProps) {
	const isCurrentAlbum = usePlayerStore(
		(state) => state.queue.at(state.index)?.albumId === albumId,
	);
	const isPlaying = usePlayerStore(
		(state) => state.status === "playing" || state.status === "loading",
	);
	const playTracks = usePlayerStore((state) => state.playTracks);
	const togglePlayback = usePlayerStore((state) => state.togglePlayback);
	const isPlayingAlbum = isCurrentAlbum && isPlaying;
	const disabled = tracks.length === 0;

	return (
		<View className="flex-row items-center gap-2">
			<Pressable
				accessibilityLabel="Shuffle album"
				accessibilityRole="button"
				accessibilityState={{ disabled }}
				className="size-11 items-center justify-center rounded-full active:opacity-60 disabled:opacity-40"
				disabled={disabled}
				onPress={() => playTracks(tracks, 0, { shuffle: true })}
			>
				<Icon
					name={{ ios: "shuffle", android: "shuffle", web: "shuffle" }}
					size={26}
				/>
			</Pressable>
			<Pressable
				accessibilityLabel={isPlayingAlbum ? "Pause" : "Play album"}
				accessibilityRole="button"
				accessibilityState={{ disabled }}
				className="size-14 items-center justify-center rounded-full bg-primary active:opacity-80 disabled:opacity-40"
				disabled={disabled}
				onPress={() =>
					isCurrentAlbum
						? togglePlayback()
						: playTracks(tracks, 0, { shuffle: false })
				}
			>
				<Icon
					className="accent-primary-foreground"
					name={
						isPlayingAlbum
							? { ios: "pause.fill", android: "pause", web: "pause" }
							: { ios: "play.fill", android: "play_arrow", web: "play_arrow" }
					}
					size={30}
				/>
			</Pressable>
		</View>
	);
}
