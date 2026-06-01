import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const partyQueries = {
	getParties: (query?: string) =>
		queryOptions({
			queryKey: ["parties", "searchList", query],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["PartyItems"][]>(
					"/parties/list",
					{
						method: "GET",
					},
				);
				if (!result.ok) return [];
				return result.data;
			},
		}),
};
