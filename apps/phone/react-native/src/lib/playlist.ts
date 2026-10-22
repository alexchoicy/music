import { useQueries } from "@tanstack/react-query";

import { getDiscCover } from "@/lib/music";
import type { AlbumDetails, PlaylistEntry } from "@/lib/schema";
import { albumQueries } from "@/queries/albums";

/** Details of the albums a playlist's entries come from, keyed by album id. */
export function usePlaylistAlbums(entries: PlaylistEntry[]) {
	const albumIds = [...new Set(entries.map((entry) => String(entry.albumId)))];
	return useQueries({
		queries: albumIds.map((id) => albumQueries.detail(id)),
		combine: (results) =>
			new Map(
				results.flatMap((result, index) =>
					result.data ? [[albumIds[index], result.data] as const] : [],
				),
			),
	});
}

/** The first four distinct discs of a playlist, for its cover mosaic. */
export function getCoverEntries(entries: PlaylistEntry[]) {
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

export function getEntryCover(
	entry: PlaylistEntry,
	albums: ReadonlyMap<string, AlbumDetails>,
) {
	const album = albums.get(String(entry.albumId));
	return album ? getDiscCover(album, entry.albumDiscId) : null;
}
