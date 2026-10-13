import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const searchQueries = {
	// limit caps each result group; 0 returns every match.
	getSearch: (query: string, limit = 0) =>
		queryOptions({
			queryKey: ["search", query, limit],
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams({ query });
				if (limit > 0) params.set("limit", String(limit));
				const result = await $APIFetch<components["schemas"]["SearchResult"]>(
					`/search?${params.toString()}`,
					{ signal },
				);

				if (!result.ok) throw new Error("Unable to search");

				return result.data;
			},
		}),
};
