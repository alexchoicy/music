import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const statsQueries = {
	getLibraryStats: () =>
		queryOptions({
			queryKey: ["stats"],
			staleTime: 30_000,
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<components["schemas"]["LibraryStats"]>(
					"/stats",
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
