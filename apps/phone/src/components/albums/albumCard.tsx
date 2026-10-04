import type { components } from "@api/schema";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { getAlbumCoverUrl } from "@/lib/album";

type AlbumCardProps = {
	album: components["schemas"]["AlbumListItem"];
};

export function AlbumCard({ album }: AlbumCardProps) {
	const coverUrl =
		getAlbumCoverUrl(album.discCovers?.[0]?.variants) ??
		getAlbumCoverUrl(album.coverVariants);
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	return (
		<View
			accessible
			accessibilityLabel={`${album.title}, ${artistNames}`}
			className="flex-1 gap-1.5"
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
				<Text className="text-xs font-medium text-foreground" numberOfLines={1}>
					{album.title}
				</Text>
				<Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
					{artistNames}
				</Text>
			</View>
		</View>
	);
}
