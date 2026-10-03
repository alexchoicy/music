import type { components } from "#/data/APIschema";
import type { PlaylistDetails } from "#/lib/queries/playlist.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";

export function playlistCoverEntries(entries: PlaylistDetails["entries"]) {
	const discs = new Set<string>();
	return entries
		.filter((entry) => {
			const id = String(entry.albumDiscId);
			if (discs.has(id)) return false;
			discs.add(id);
			return true;
		})
		.slice(0, 4);
}

export function playlistEntryCoverUrl(
	entry: Pick<PlaylistDetails["entries"][number], "albumDiscId">,
	album: components["schemas"]["AlbumDetails"] | undefined,
) {
	return (
		getAlbumCoverUrl(
			album?.cover.discs.find(
				(disc) => String(disc.albumDiscId) === String(entry.albumDiscId),
			)?.variants,
		) ?? getAlbumCoverUrl(album?.cover.album)
	);
}
