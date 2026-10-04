import type { components, paths } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

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
};
