import { queryOptions } from "@tanstack/react-query";

import type { paths } from "@/data/APIschema";
import { api } from "@/lib/api";
import type { AlbumDetails, AlbumListItem, Language } from "@/lib/schema";
import { getOfflineAlbum, syncSavedAlbum } from "@/offline/downloads";

export type AlbumQuery = NonNullable<
	paths["/albums"]["get"]["parameters"]["query"]
>;

export const albumQueries = {
	list: (query: AlbumQuery) =>
		queryOptions({
			queryKey: ["albums", "list", query],
			queryFn: ({ signal }) =>
				api<AlbumListItem[]>("/albums", { query, signal }),
		}),
	detail: (id: number | string) =>
		queryOptions({
			queryKey: ["albums", "detail", String(id)],
			queryFn: async ({ signal }) => {
				let album: AlbumDetails;
				try {
					album = await api<AlbumDetails>(`/albums/${id}`, { signal });
				} catch (error) {
					// Without the server, a downloaded copy still opens.
					if (error instanceof TypeError) {
						const saved = getOfflineAlbum(String(id));
						if (saved) return saved;
					}
					throw error;
				}
				syncSavedAlbum(album);
				return album;
			},
			// Runs while offline so downloaded albums load from the device.
			networkMode: "offlineFirst",
		}),
	languages: () =>
		queryOptions({
			queryKey: ["languages"],
			queryFn: ({ signal }) => api<Language[]>("/languages", { signal }),
			staleTime: 5 * 60 * 1000,
		}),
};
