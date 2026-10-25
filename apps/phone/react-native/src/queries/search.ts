import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { SearchResult } from "@/lib/schema";

export const searchQueries = {
	search: (query: string) =>
		queryOptions({
			queryKey: ["search", query],
			queryFn: ({ signal }) =>
				api<SearchResult>("/search", { query: { Query: query }, signal }),
			// Each typed query is its own entry, so they are not kept for offline use.
			gcTime: 1000 * 60 * 5,
		}),
};
