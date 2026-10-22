import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AlbumTypeBadge } from "@/components/albums/albumTypeBadge";
import { usePlayAlbum } from "@/components/albums/usePlayAlbum";
import { Artwork } from "@/components/ui/artwork";
import { ArtworkPlayButton } from "@/components/ui/artworkPlayButton";
import { PlayingBars } from "@/components/ui/playingBars";
import { PlayingGlow } from "@/components/ui/playingGlow";
import { cn } from "@/lib/cn";
import type { AlbumTile } from "@/lib/music";
import { useArtworkUri } from "@/offline/offlineStore";
import { usePlayerStore } from "@/player/playerStore";

// Narrower tiles show only the type badge's icon.
const compactBadgeWidth = 140;
const playButtonInset = 8;
const playButtonSize = 40;

type AlbumCardProps = {
	album: AlbumTile;
	width: number;
};

export function AlbumCard({ album, width }: AlbumCardProps) {
	const coverUri = useArtworkUri(album.cover);
	const playAlbum = usePlayAlbum();
	const isPlaying = usePlayerStore(
		(state) =>
			state.status === "playing" &&
			state.queue.at(state.index)?.albumId === album.albumId,
	);
	const artists = album.artists || "Unknown artist";
	const play = () => playAlbum(album.albumId);

	return (
		<View style={{ width }}>
			<Link
				asChild
				href={{ pathname: "/album/[id]", params: { id: album.albumId } }}
				push
			>
				<Pressable
					accessibilityActions={[{ name: "play", label: "Play" }]}
					accessibilityLabel={[
						isPlaying ? "Now playing" : null,
						album.title,
						album.type,
						artists,
					]
						.filter(Boolean)
						.join(", ")}
					accessibilityRole="link"
					className="gap-2.5 active:opacity-70"
					onAccessibilityAction={(event) => {
						if (event.nativeEvent.actionName === "play") void play();
					}}
				>
					<View>
						<Artwork recyclingKey={album.albumId} uri={coverUri} />
						{isPlaying && <PlayingGlow className="rounded-xl" />}
						{album.type !== "Album" && (
							<AlbumTypeBadge
								className="absolute top-2 left-2"
								iconOnly={width < compactBadgeWidth}
								surface="artwork"
								type={album.type}
							/>
						)}
					</View>
					<View className="gap-0.5">
						<View className="flex-row items-center gap-1.5">
							{isPlaying && <PlayingBars />}
							<Text
								className={cn(
									"shrink text-sm font-semibold",
									isPlaying ? "text-primary" : "text-foreground",
								)}
								numberOfLines={1}
							>
								{album.title}
							</Text>
						</View>
						<Text className="text-xs text-muted-foreground" numberOfLines={1}>
							{artists}
						</Text>
					</View>
				</Pressable>
			</Link>
			{/* A sibling of the link, so screen readers reach both; the link also offers a Play action. */}
			<ArtworkPlayButton
				className="absolute"
				label={`Play ${album.title}`}
				onPlay={play}
				style={{
					top: width - playButtonSize - playButtonInset,
					right: playButtonInset,
				}}
			/>
		</View>
	);
}
