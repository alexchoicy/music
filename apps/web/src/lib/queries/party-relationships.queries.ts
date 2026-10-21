import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "#/lib/APIFetchClient";

export type RelationshipType = API.PartyRelationshipType;
export type RelationshipGraph = API.PartyRelationshipGraph;
export type Relationship = API.PartyRelationshipDetails;
export type RelationshipParty = API.PartySummary;

export const relationshipLabels: Record<RelationshipType, string> = {
	MemberOf: "Member of",
	VoiceActorOf: "Voice actor for (声優)",
	AffiliatedWith: "Affiliated with",
};

export const relationshipOptions = Object.entries(relationshipLabels).map(
	([value, label]) => ({ value: value as RelationshipType, label }),
);

export const partyRelationshipQueries = {
	graph: (partyId: number) =>
		queryOptions({
			queryKey: ["party-relationships", partyId],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<RelationshipGraph>(
					`/parties/${partyId}/relationships`,
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};

export const partyRelationshipMutation = {
	delete: () => ({
		mutationFn: async (relationshipId: Relationship["relationshipId"]) => {
			const result = await $APIFetch<void>(`/relationships/${relationshipId}`, {
				method: "DELETE",
			});
			if (!result.ok) throw result.error;
		},
	}),
	create: () => ({
		mutationFn: async ({
			sourcePartyId,
			...request
		}: API.CreatePartyRelationshipRequest & {
			sourcePartyId: number;
		}) => {
			const result = await $APIFetch<API.CreatePartyRelationshipResult>(
				`/parties/${sourcePartyId}/relationships`,
				{
					method: "POST",
					body: JSON.stringify(request),
				},
			);
			if (!result.ok) throw result.error;
			return result.data;
		},
	}),
};
