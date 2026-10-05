import type { components } from "@api/schema";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { getAlbumCover } from "@/lib/album";
import { useClearTabHistory } from "@/lib/navigation";
import { useArtworkUri } from "@/lib/offline/media";

type AlbumCardProps = {
	album: components["schemas"]["AlbumListItem"];
};

export function AlbumCard({ album }: AlbumCardProps) {
	const coverUrl = useArtworkUri(
		getAlbumCover(album.discCovers?.[0]?.variants) ??
			getAlbumCover(album.coverVariants),
	);
	const clearTabHistory = useClearTabHistory();
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	return (
		<Link
			asChild
			href={{ pathname: "/albums/[id]", params: { id: String(album.albumId) } }}
			onPress={(event) => clearTabHistory("albums", event)}
			push
			withAnchor
		>
			<Pressable
				accessibilityLabel={`${album.title}, ${artistNames}`}
				accessibilityRole="link"
				className="flex-1 gap-1.5 active:opacity-70"
			>
				<View className="aspect-square overflow-hidden rounded-lg bg-muted">
					{coverUrl ? (
						<Image
							contentFit="cover"
							recyclingKey={String(album.albumId)}
							source={coverUrl}
							style={{ width: "100%", height: "100%" }}
							transition={150}
						/>
					) : (
						<View className="flex-1 items-center justify-center">
							<Icon
								className="accent-muted-foreground"
								name={{ ios: "opticaldisc", android: "album", web: "album" }}
								size={28}
							/>
						</View>
					)}
				</View>
				<View>
					<Text
						className="text-xs font-medium text-foreground"
						numberOfLines={1}
					>
						{album.title}
					</Text>
					<Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
						{artistNames}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
