import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "#/lib/APIFetchClient";

export type PlaylistDetails = API.PlaylistDetails;
export type PlaylistListItem = API.PlaylistListItem;
export type PlaylistTrackRequest = API.PlaylistTrackRequest;

export const playlistQueries = {
	list: (userId: string) =>
		queryOptions({
			queryKey: ["playlists", userId, "list"],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<PlaylistListItem[]>("/playlists", {
					signal,
				});
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
	detail: (userId: string, id: string | number) =>
		queryOptions({
			queryKey: ["playlists", userId, "detail", String(id)],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<PlaylistDetails>(`/playlists/${id}`, {
					signal,
				});
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};

async function writePlaylist(endpoint: string, method: string, body?: unknown) {
	const result = await $APIFetch<void>(endpoint, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!result.ok) throw result.error;
}

export const playlistActions = {
	create: async (request: API.CreatePlaylistRequest) => {
		const result = await $APIFetch<PlaylistDetails>("/playlists", {
			method: "POST",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
	rename: (
		id: PlaylistDetails["playlistId"],
		request: API.RenamePlaylistRequest,
	) => writePlaylist(`/playlists/${id}`, "PUT", request),
	delete: (
		id: PlaylistDetails["playlistId"],
		version: PlaylistDetails["version"],
	) => writePlaylist(`/playlists/${id}?version=${version}`, "DELETE"),
	add: (
		id: PlaylistDetails["playlistId"],
		request: API.AddPlaylistEntriesRequest,
	) => writePlaylist(`/playlists/${id}/entries`, "POST", request),
	remove: (
		id: PlaylistDetails["playlistId"],
		entryId: PlaylistDetails["entries"][number]["entryId"],
		version: PlaylistDetails["version"],
	) =>
		writePlaylist(
			`/playlists/${id}/entries/${entryId}?version=${version}`,
			"DELETE",
		),
	reorder: (
		id: PlaylistDetails["playlistId"],
		request: API.ReorderPlaylistEntriesRequest,
	) => writePlaylist(`/playlists/${id}/entries/order`, "PUT", request),
};
