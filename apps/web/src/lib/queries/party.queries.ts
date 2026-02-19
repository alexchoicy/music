import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const partyQueries = {
	getPartySearchList: (apiEndpoint: string, query?: string) =>
		queryOptions({
			queryKey: ["parties", "searchList", apiEndpoint, query],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["PartyListModel"][]
				>(
					apiEndpoint,
					"/parties/list?" +
						new URLSearchParams({
							Search: query || "",
						}),
					{
						method: "GET",
					},
				);
				if (!result.ok) return [];
				return result.data;
			},
		}),
	getParties: (apiEndpoint: string) =>
		queryOptions({
			queryKey: ["parties", apiEndpoint],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["PartyModel"][]>(
					apiEndpoint,
					"/parties",
					{
						method: "GET",
					},
				);
				if (!result.ok) return [];
				return result.data;
			},
		}),
	getParty: (apiEndpoint: string, id: string) =>
		queryOptions({
			queryKey: ["parties", apiEndpoint, id],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["PartyDetailModel"]
				>(apiEndpoint, `/parties/${id}`, {
					method: "GET",
				});
				if (!result.ok) throw new Error("Failed to fetch party");
				return result.data;
			},
		}),
};

export const partyMutations = {
	create: (apiEndpoint: string) => ({
		mutationFn: async (data: components["schemas"]["CreatePartyRequest"]) => {
			const result = await $APIFetch(apiEndpoint, "/parties", {
				method: "POST",
				body: JSON.stringify(data),
			});
			if (!result.ok) {
				throw new Error("Failed to create party");
			}
			return result;
		},
	}),
};
