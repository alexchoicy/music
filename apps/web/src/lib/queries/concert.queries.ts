import { queryOptions } from "@tanstack/react-query";

import type { components, paths } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type ConcertQuery = paths["/concerts"]["get"]["parameters"]["query"];

export const concertQueries = {
	getConcerts: (query?: ConcertQuery) =>
		queryOptions({
			queryKey: ["concerts", query],
			queryFn: async () => {
				const params = new URLSearchParams();

				if (query?.Search) params.append("Search", query.Search);
				if (query?.PartyIds)
					query.PartyIds.map((item) => params.append("PartyIds", String(item)));
				if (query?.IsIncludeInGuestCredit)
					params.append("IsIncludeInGuestCredit", "true");

				const url = params.size
					? `/concerts?${params.toString()}`
					: "/concerts";

				const result = await $APIFetch<
					components["schemas"]["ConcertListItem"][]
				>(url, {
					method: "GET",
				});
				if (!result.ok) return [];
				return result.data;
			},
		}),
	getConcert: (id: number | string) =>
		queryOptions({
			queryKey: ["concerts", id],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["ConcertDetails"]>(
					`/concerts/${id}`,
					{
						method: "GET",
					},
				);

				if (!result.ok) {
					throw new Error("Unable to load concert");
				}

				return result.data;
			},
		}),
};
