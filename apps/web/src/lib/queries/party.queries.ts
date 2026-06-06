import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const partyQueries = {
	getParties: () =>
		queryOptions({
			queryKey: ["parties"],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["PartyItems"][]>(
					"/parties",
					{
						method: "GET",
					},
				);
				if (!result.ok) return [];
				return result.data;
			},
		}),
};
