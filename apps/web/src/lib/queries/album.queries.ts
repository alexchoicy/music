import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type AlbumQuery = API.GetAlbumsData["query"];

export const albumQueries = {
	getAlbums: (query?: AlbumQuery) =>
		queryOptions({
			queryKey: ["albums", "list", query],
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams();

				if (query?.Search) params.append("Search", query.Search);
				if (query?.Types)
					query.Types.map((item) => params.append("Types", item));
				if (query?.LanguageIds)
					query.LanguageIds.map((item) =>
						params.append("LanguageIds", String(item)),
					);
				if (query?.PartyIds)
					query.PartyIds.map((item) => params.append("PartyIds", String(item)));
				if (query?.IsIncludeInTrackCredit)
					params.append("IsIncludeInTrackCredit", "true");
				if (query?.Sort) params.set("Sort", query.Sort);
				if (query?.Limit) params.set("Limit", String(query.Limit));

				const url = params.size ? `/albums?${params.toString()}` : "/albums";

				const result = await $APIFetch<API.AlbumListItem[]>(url, { signal });
				if (!result.ok)
					throw new ApiError("Unable to load albums", result.status);
				return result.data;
			},
		}),
	getAlbum: (id: number | string) =>
		queryOptions({
			queryKey: ["albums", String(id)],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<API.AlbumDetails>(`/albums/${id}`, {
					method: "GET",
					signal,
				});

				if (!result.ok) {
					throw new ApiError("Unable to load album", result.status);
				}

				return result.data;
			},
		}),
};
