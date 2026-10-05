import { useQueries, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { formatTotalDuration } from "@/lib/duration";
import { resolveArtworkUri } from "@/lib/offline/media";
import { getPlaylistCoverEntries, getPlaylistEntryCover } from "@/lib/playlist";
import { albumQueries } from "@/lib/queries/album.queries";
import type { PlaylistListItem } from "@/lib/queries/playlist.queries";
import { playlistQueries } from "@/lib/queries/playlist.queries";
import { useOfflineStore } from "@/store/offlineStore";

type PlaylistCardProps = {
	playlist: PlaylistListItem;
};

export function PlaylistCard({ playlist }: PlaylistCardProps) {
	const trackCount = Number(playlist.trackCount);
	// The list item has no artwork, so covers come from the playlist's first discs.
	const details = useQuery({
		...playlistQueries.getPlaylist(playlist.playlistId),
		enabled: trackCount > 0,
	});
	const coverEntries = getPlaylistCoverEntries(
		trackCount > 0 ? (details.data?.entries ?? []) : [],
	);
	const albumIds = [
		...new Set(coverEntries.map((entry) => String(entry.albumId))),
	];
	const albums = useQueries({
		queries: albumIds.map((id) => albumQueries.getAlbum(id)),
	});
	const artwork = useOfflineStore((state) => state.artwork);
	const coverUrls = coverEntries.map((entry) =>
		resolveArtworkUri(
			getPlaylistEntryCover(
				entry,
				albums[albumIds.indexOf(String(entry.albumId))]?.data,
			),
			artwork,
		),
	);
	const tiles =
		coverUrls.length > 1
			? Array.from(
					{ length: 4 },
					(_, index) => coverUrls[index % coverUrls.length],
				)
			: [coverUrls[0] ?? null];

	const summary =
		trackCount === 0
			? "Empty playlist"
			: `${trackCount} ${trackCount === 1 ? "track" : "tracks"} · ${formatTotalDuration(playlist.totalDurationInMs)}`;

	return (
		<View
			accessible
			accessibilityLabel={`${playlist.name}, ${summary}`}
			className="flex-1 gap-1.5"
		>
			<View className="aspect-square flex-row flex-wrap overflow-hidden rounded-lg bg-muted">
				{tiles.map((url, index) => (
					<View
						className="items-center justify-center"
						key={index}
						style={
							tiles.length > 1
								? { width: "50%", height: "50%" }
								: { width: "100%", height: "100%" }
						}
					>
						{url ? (
							<Image
								contentFit="cover"
								recyclingKey={`${playlist.playlistId}-${index}`}
								source={url}
								style={{ width: "100%", height: "100%" }}
								transition={150}
							/>
						) : (
							<Icon
								className="accent-muted-foreground"
								name={{
									ios: "music.note.list",
									android: "queue_music",
									web: "queue_music",
								}}
								size={tiles.length > 1 ? 18 : 28}
							/>
						)}
					</View>
				))}
			</View>
			<View>
				<Text className="text-xs font-medium text-foreground" numberOfLines={1}>
					{playlist.name}
				</Text>
				<Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
					{summary}
				</Text>
			</View>
		</View>
	);
}
