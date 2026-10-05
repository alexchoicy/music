import type { components } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export const searchQueries = {
	getSearch: (query: string) =>
		queryOptions({
			queryKey: ["search", query],
			queryFn: async ({ signal }) => {
				const result = await apiFetch<components["schemas"]["SearchResult"]>(
					`/search?Query=${encodeURIComponent(query)}`,
					{ signal },
				);
				if (!result.ok) throw new Error("Unable to search");
				return result.data;
			},
			// Each typed query is its own entry, so they are not kept for offline use.
			gcTime: 1000 * 60 * 5,
		}),
};
