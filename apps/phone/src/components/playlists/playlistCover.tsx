import { Image } from "expo-image";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import {
	getCoverEntries,
	getEntryCover,
	usePlaylistAlbums,
} from "@/lib/playlist";
import type { PlaylistEntry } from "@/lib/schema";
import { useOfflineStore } from "@/offline/offlineStore";

type PlaylistCoverProps = {
	entries: PlaylistEntry[];
	size?: number;
};

/** Up to four disc covers from the playlist, or a placeholder. */
export function PlaylistCover({ entries, size }: PlaylistCoverProps) {
	const coverEntries = getCoverEntries(entries);
	const albums = usePlaylistAlbums(coverEntries);
	const artwork = useOfflineStore((state) => state.artwork);
	const uris = coverEntries.flatMap((entry) => {
		const file = getEntryCover(entry, albums);
		return file ? [artwork[file.id] ?? file.url] : [];
	});
	// A mosaic needs four tiles, so fewer covers repeat.
	const tiles =
		uris.length > 1
			? Array.from({ length: 4 }, (_, index) => uris[index % uris.length])
			: uris;

	return (
		<View
			className="aspect-square flex-row flex-wrap overflow-hidden rounded-xl bg-surface-strong"
			style={size ? { width: size } : { width: "100%" }}
		>
			{tiles.length === 0 ? (
				<View className="flex-1 items-center justify-center">
					<Icon
						className="accent-muted-foreground"
						name="playlist"
						size={size ? size * 0.36 : 36}
					/>
				</View>
			) : (
				tiles.map((uri, index) => (
					<Image
						contentFit="cover"
						key={index}
						source={uri}
						style={
							tiles.length > 1
								? { width: "50%", height: "50%" }
								: { width: "100%", height: "100%" }
						}
						transition={150}
					/>
				))
			)}
		</View>
	);
}
