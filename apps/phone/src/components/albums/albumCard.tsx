import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import type { AlbumTile } from "@/lib/music";
import { useArtworkUri } from "@/offline/offlineStore";

type AlbumCardProps = {
	album: AlbumTile;
	/** A fixed width, e.g. in a horizontal row; grids size the card instead. */
	width?: number;
};

export function AlbumCard({ album, width }: AlbumCardProps) {
	const coverUri = useArtworkUri(album.cover);
	const artists = album.artists || "Unknown artist";

	return (
		<Link
			asChild
			href={{ pathname: "/album/[id]", params: { id: album.albumId } }}
			push
		>
			<Pressable
				accessibilityLabel={`${album.title}, ${album.type}, ${artists}`}
				accessibilityRole="link"
				className="gap-2 active:opacity-70"
				style={width ? { width } : undefined}
			>
				<Artwork recyclingKey={album.albumId} uri={coverUri} />
				<View>
					<Text
						className="text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{album.title}
					</Text>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{artists}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
