import { Image } from "expo-image";
import { View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
	getCoverEntries,
	getEntryCover,
	usePlaylistAlbums,
} from "@/lib/playlist";
import type { FileObject, PlaylistEntry } from "@/lib/schema";
import { useOfflineStore } from "@/offline/offlineStore";

type PlaylistCoverProps = {
	files: (FileObject | null | undefined)[];
	size?: number;
};

/** A mosaic of up to four disc covers, or a placeholder. */
export function PlaylistCover({ files, size }: PlaylistCoverProps) {
	const artwork = useOfflineStore((state) => state.artwork);
	const uris = files.flatMap((file) =>
		file ? [artwork[file.id] ?? file.url] : [],
	);
	const tiles =
		uris.length > 1
			? Array.from({ length: 4 }, (_, index) => uris[index % uris.length])
			: uris;

	return (
		<View
			className={cn(
				"aspect-square flex-row flex-wrap overflow-hidden bg-muted",
				// Matches Artwork, which rounds small covers less.
				!size
					? "rounded-xl"
					: size < 64
						? "rounded-lg"
						: // A hero cover, like the album page's.
							"rounded-4xl",
			)}
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
						cachePolicy="memory-disk"
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

export function PlaylistEntriesCover({
	entries,
	size,
}: {
	entries: PlaylistEntry[];
	size?: number;
}) {
	const coverEntries = getCoverEntries(entries);
	const albums = usePlaylistAlbums(coverEntries);

	return (
		<PlaylistCover
			files={coverEntries.map((entry) => getEntryCover(entry, albums))}
			size={size}
		/>
	);
}
