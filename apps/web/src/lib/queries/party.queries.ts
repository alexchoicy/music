import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const partyQueries = {
	getPartySearchList: (query?: string) =>
		queryOptions({
			queryKey: ["parties", "searchList", query],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["PartyListModel"][]
				>(
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
	getParties: () =>
		queryOptions({
			queryKey: ["parties"],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["PartyModel"][]>(
					"/parties",
					{
						method: "GET",
					},
				);
				if (!result.ok) return [];
				return result.data;
			},
		}),
	getParty: (id: string) =>
		queryOptions({
			queryKey: ["parties", id],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["PartyDetailModel"]
				>(`/parties/${id}`, {
					method: "GET",
				});
				if (!result.ok) throw new Error("Failed to fetch party");
				return result.data;
			},
		}),
};

export const partyMutations = {
	create: {
		mutationFn: async (data: components["schemas"]["CreatePartyRequest"]) => {
			const result = await $APIFetch("/parties", {
				method: "POST",
				body: JSON.stringify(data),
			});
			if (!result.ok) {
				throw new Error("Failed to create party");
			}
			return result;
		},
	},
};
