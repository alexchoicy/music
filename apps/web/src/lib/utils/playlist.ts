import type { PlaylistDetails } from "#/lib/queries/playlist.queries";

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
