import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "../APIFetchClient";

export const statsQueries = {
	getLibraryStats: () =>
		queryOptions({
			queryKey: ["stats"],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<API.LibraryStats>("/stats", { signal });
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
