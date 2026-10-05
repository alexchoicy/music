import type { components, paths } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { getOfflineAlbum, syncSavedAlbum } from "@/lib/offline/downloads";

export type AlbumQuery = paths["/albums"]["get"]["parameters"]["query"];

function toQueryString(query: AlbumQuery = {}) {
	const params: string[] = [];
	const append = (key: string, value: string | number) =>
		params.push(`${key}=${encodeURIComponent(value)}`);

	if (query.Search) append("Search", query.Search);
	query.Types?.forEach((type) => append("Types", type));
	query.LanguageIds?.forEach((id) => append("LanguageIds", id));
	query.PartyIds?.forEach((id) => append("PartyIds", id));
	if (query.IsIncludeInTrackCredit) append("IsIncludeInTrackCredit", "true");
	if (query.Sort) append("Sort", query.Sort);
	if (query.Limit) append("Limit", query.Limit);

	return params.length ? `?${params.join("&")}` : "";
}

export const albumQueries = {
	getAlbums: (query?: AlbumQuery) =>
		queryOptions({
			queryKey: ["albums", query],
			queryFn: async () => {
				const result = await apiFetch<components["schemas"]["AlbumListItem"][]>(
					`/albums${toQueryString(query)}`,
				);
				if (!result.ok) throw new Error("Unable to load albums");
				return result.data;
			},
		}),
	getAlbum: (id: number | string) =>
		queryOptions({
			queryKey: ["albums", "detail", String(id)],
			queryFn: async () => {
				let result;
				try {
					result = await apiFetch<components["schemas"]["AlbumDetails"]>(
						`/albums/${id}`,
					);
				} catch (error) {
					// The server is unreachable, so fall back to a downloaded copy.
					const saved = getOfflineAlbum(String(id));
					if (saved) return saved;
					throw error;
				}
				if (!result.ok) throw new Error("Unable to load album");

				// Keep a downloaded album in sync with the server.
				syncSavedAlbum(result.data);
				return result.data;
			},
			// Run while offline so downloaded albums can load from the device.
			networkMode: "offlineFirst",
		}),
};
