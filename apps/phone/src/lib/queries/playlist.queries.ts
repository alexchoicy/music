import type { components } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export type PlaylistListItem = components["schemas"]["PlaylistListItem"];
export type PlaylistDetails = components["schemas"]["PlaylistDetails"];

export const playlistQueries = {
	getPlaylists: () =>
		queryOptions({
			queryKey: ["playlists", "list"],
			queryFn: async () => {
				const result = await apiFetch<PlaylistListItem[]>("/playlists");
				if (!result.ok) throw new Error("Unable to load playlists");
				return result.data;
			},
		}),
	getPlaylist: (id: number | string) =>
		queryOptions({
			queryKey: ["playlists", "detail", String(id)],
			queryFn: async () => {
				const result = await apiFetch<PlaylistDetails>(`/playlists/${id}`);
				if (!result.ok) throw new Error("Unable to load playlist");
				return result.data;
			},
		}),
};

export const playlistMutations = {
	create: () => ({
		mutationFn: async (
			request: components["schemas"]["CreatePlaylistRequest"],
		) => {
			const result = await apiFetch<PlaylistDetails>("/playlists", {
				method: "POST",
				body: JSON.stringify(request),
			});
			if (!result.ok) throw new Error("Unable to create playlist");
			return result.data;
		},
	}),
};
