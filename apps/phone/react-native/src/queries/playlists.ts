import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
	PlaylistDetails,
	PlaylistEntry,
	PlaylistListItem,
} from "@/lib/schema";
import { getOfflinePlaylist, syncSavedPlaylist } from "@/offline/downloads";
import { fetchAlbum } from "@/queries/albums";

export const playlistQueries = {
	list: () =>
		queryOptions({
			queryKey: ["playlists", "list"],
			queryFn: ({ signal }) =>
				api<PlaylistListItem[]>("/playlists", { signal }),
		}),
	detail: (id: number | string) =>
		queryOptions({
			queryKey: ["playlists", "detail", String(id)],
			queryFn: async ({ client, signal }) => {
				let playlist: PlaylistDetails;
				try {
					playlist = await api<PlaylistDetails>(`/playlists/${id}`, {
						signal,
					});
				} catch (error) {
					// Without the server, a downloaded copy still opens.
					if (error instanceof TypeError) {
						const saved = getOfflinePlaylist(String(id));
						if (saved) return saved;
					}
					throw error;
				}
				syncSavedPlaylist(playlist, (albumId) => fetchAlbum(client, albumId));
				return playlist;
			},
			// Runs while offline so downloaded playlists load from the device.
			networkMode: "offlineFirst",
		}),
};

export const playlistMutations = {
	create: (name: string) =>
		api<PlaylistDetails>("/playlists", { method: "POST", body: { name } }),
	rename: (
		playlist: Pick<PlaylistListItem, "playlistId" | "version">,
		name: string,
	) =>
		api<null>(`/playlists/${playlist.playlistId}`, {
			method: "PUT",
			body: { name, version: playlist.version },
		}),
	delete: (playlist: Pick<PlaylistListItem, "playlistId" | "version">) =>
		api<null>(`/playlists/${playlist.playlistId}`, {
			method: "DELETE",
			query: { version: playlist.version },
		}),
	/** `version` guards against editing a playlist changed elsewhere (409). */
	addTrack: (
		playlist: Pick<PlaylistListItem, "playlistId" | "version">,
		track: { albumDiscId: string; trackId: string },
	) =>
		api<null>(`/playlists/${playlist.playlistId}/entries`, {
			method: "POST",
			body: { version: playlist.version, tracks: [track] },
		}),
	removeEntry: (
		playlist: Pick<PlaylistDetails, "playlistId" | "version">,
		entry: Pick<PlaylistEntry, "entryId">,
	) =>
		api<null>(`/playlists/${playlist.playlistId}/entries/${entry.entryId}`, {
			method: "DELETE",
			query: { version: playlist.version },
		}),
};
