import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
	PlaylistDetails,
	PlaylistEntry,
	PlaylistListItem,
} from "@/lib/schema";

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
			queryFn: ({ signal }) =>
				api<PlaylistDetails>(`/playlists/${id}`, { signal }),
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
