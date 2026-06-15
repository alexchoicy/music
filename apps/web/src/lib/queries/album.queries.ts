import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const albumQueries = {
	getAlbums: () =>
		queryOptions({
			queryKey: ["albums"],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AlbumListItem"][]
				>("/albums", {
					method: "GET",
				});
				if (!result.ok) return [];
				return result.data;
			},
		}),
};
