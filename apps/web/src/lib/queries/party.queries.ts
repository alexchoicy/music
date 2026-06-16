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
	getParty: (id: number | string) =>
		queryOptions({
			queryKey: ["parties", id],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["PartyDetails"]>(
					`/parties/${id}`,
					{
						method: "GET",
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
