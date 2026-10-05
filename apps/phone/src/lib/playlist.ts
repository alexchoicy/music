import type { components } from "@api/schema";

import { getAlbumCover } from "@/lib/album";
import type { PlaylistDetails } from "@/lib/queries/playlist.queries";

/** The first four distinct discs in a playlist, used for its cover mosaic. */
export function getPlaylistCoverEntries(entries: PlaylistDetails["entries"]) {
	const discIds = new Set<string>();
	return entries
		.filter((entry) => {
			const id = String(entry.albumDiscId);
			if (discIds.has(id)) return false;
			discIds.add(id);
			return true;
		})
		.slice(0, 4);
}

export function getPlaylistEntryCover(
	entry: Pick<PlaylistDetails["entries"][number], "albumDiscId">,
	album: components["schemas"]["AlbumDetails"] | undefined,
) {
	return (
		getAlbumCover(
			album?.cover.discs.find(
				(disc) => String(disc.albumDiscId) === String(entry.albumDiscId),
			)?.variants,
		) ?? getAlbumCover(album?.cover.album)
	);
}
