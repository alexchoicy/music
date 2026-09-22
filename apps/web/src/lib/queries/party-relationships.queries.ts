import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";
import { $APIFetch } from "#/lib/APIFetchClient";

export type RelationshipType = components["schemas"]["PartyRelationshipType"];
export type RelationshipGraph = components["schemas"]["PartyRelationshipGraph"];
export type Relationship = components["schemas"]["PartyRelationshipDetails"];
export type RelationshipParty = components["schemas"]["PartySummary"];

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
		}: components["schemas"]["CreatePartyRelationshipRequest"] & {
			sourcePartyId: number;
		}) => {
			const result = await $APIFetch<
				components["schemas"]["CreatePartyRelationshipResult"]
			>(`/parties/${sourcePartyId}/relationships`, {
				method: "POST",
				body: JSON.stringify(request),
			});
			if (!result.ok) throw result.error;
			return result.data;
		},
	}),
};
