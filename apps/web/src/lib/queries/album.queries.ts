import { queryOptions } from "@tanstack/react-query";

import type { components, paths } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type AlbumQuery = paths["/albums"]["get"]["parameters"]["query"];

export const albumQueries = {
	getAlbums: (query?: AlbumQuery) =>
		queryOptions({
			queryKey: ["albums", query],
			staleTime: 30_000,
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

				const result = await $APIFetch<
					components["schemas"]["AlbumListItem"][]
				>(url, { signal });
				if (!result.ok) throw new Error("Unable to load albums");
				return result.data;
			},
		}),
	getAlbum: (id: number | string) =>
		queryOptions({
			queryKey: ["albums", String(id)],
			staleTime: 30_000,
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<components["schemas"]["AlbumDetails"]>(
					`/albums/${id}`,
					{
						method: "GET",
						signal,
					},
				);

				if (!result.ok) {
					throw new Error("Unable to load album");
				}

				return result.data;
			},
		}),
};
