import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const homeQueries = {
	getOverview: () =>
		queryOptions({
			queryKey: ["home"],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<components["schemas"]["HomeOverview"]>(
					"/home",
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
