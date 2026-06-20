import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const concertQueries = {
	getConcerts: () =>
		queryOptions({
			queryKey: ["concerts"],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["ConcertListItem"][]
				>("/concerts", {
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
