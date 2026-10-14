import { queryOptions } from "@tanstack/react-query";

import type { components, paths } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type PartyQuery = paths["/parties"]["get"]["parameters"]["query"];

export const partyQueries = {
	getParties: (query?: PartyQuery) =>
		queryOptions({
			queryKey: ["parties", query],
			staleTime: 30_000,
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams();

				if (query?.Search) params.set("Search", query.Search);
				if (query?.Country) params.set("Country", query.Country);
				if (query?.Type) params.set("Type", query.Type);
				if (query?.Kind) params.set("Kind", query.Kind);
				if (query?.Gender) params.set("Gender", query.Gender);
				if (query?.ExcludeNoAlbums) params.set("ExcludeNoAlbums", "true");
				if (query?.Sort) params.set("Sort", query.Sort);
				if (query?.Limit) params.set("Limit", String(query.Limit));

				const url = params.size ? `/parties?${params}` : "/parties";

				const result = await $APIFetch<components["schemas"]["PartyItems"][]>(
					url,
					{ signal },
				);

				if (!result.ok) {
					throw new Error("Unable to load parties");
				}
				return result.data;
			},
		}),
	getParty: (id: number | string) =>
		queryOptions({
			queryKey: ["parties", String(id)],
			staleTime: 30_000,
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<components["schemas"]["PartyDetails"]>(
					`/parties/${id}`,
					{
						method: "GET",
						signal,
					},
				);

				if (!result.ok) {
					throw new Error("Unable to load party");
				}

				return result.data;
			},
		}),
};

export const partyMutation = {
	createParty: () => ({
		mutationFn: async (info: components["schemas"]["CreatePartyRequest"]) => {
			const result = await $APIFetch<
				components["schemas"]["CreatePartyResult"]
			>("/parties", {
				method: "POST",
				body: JSON.stringify(info),
			});
			if (!result.ok) throw new Error("Failed to create party");
			return result.data;
		},
	}),
};
