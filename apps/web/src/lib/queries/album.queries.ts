import { queryOptions } from "@tanstack/react-query";

import type { components, paths } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type AlbumQuery = paths["/albums"]["get"]["parameters"]["query"];

export const albumQueries = {
	getAlbums: (query?: AlbumQuery) =>
		queryOptions({
			queryKey: ["albums", query],
			queryFn: async () => {
				const params = new URLSearchParams();

				if (query?.Search) params.append("Search", query.Search);
				if (query?.Types)
					query.Types.map((item) => params.append("Types", item));
				if (query?.PartyIds)
					query.PartyIds.map((item) => params.append("PartyIds", String(item)));
				if (query?.IsIncludeInTrackCredit)
					params.append("IsIncludeInTrackCredit", "true");

				const url = params.size ? `/albums?${params.toString()}` : "/albums";

				const result =
					await $APIFetch<components["schemas"]["AlbumListItem"][]>(url);
				if (!result.ok) throw new Error("Unable to load albums");
				return result.data;
			},
		}),
	getAlbum: (id: number | string) =>
		queryOptions({
			queryKey: ["albums", id],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["AlbumDetails"]>(
					`/albums/${id}`,
					{
						method: "GET",
					},
				);

				if (!result.ok) {
					throw new Error("Unable to load album");
				}

				return result.data;
			},
		}),
};
