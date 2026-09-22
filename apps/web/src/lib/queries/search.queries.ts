import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const searchQueries = {
	getSearch: (query: string) =>
		queryOptions({
			queryKey: ["search", query],
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams({ query });
				const result = await $APIFetch<components["schemas"]["SearchResult"]>(
					`/search?${params.toString()}`,
					{ signal },
				);

				if (!result.ok) throw new Error("Unable to search");

				return result.data;
			},
		}),
};
