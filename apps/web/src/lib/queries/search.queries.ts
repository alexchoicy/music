import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export const searchQueries = {
	// limit caps each result group; 0 returns every match.
	getSearch: (query: string, limit = 0) =>
		queryOptions({
			queryKey: ["search", query, limit],
			staleTime: 60_000,
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams({ query });
				if (limit > 0) params.set("limit", String(limit));
				const result = await $APIFetch<API.SearchResult>(
					`/search?${params.toString()}`,
					{ signal },
				);

				if (!result.ok) throw new ApiError("Unable to search", result.status);

				return result.data;
			},
		}),
};
