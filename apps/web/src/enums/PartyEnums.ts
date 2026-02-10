import type { components } from "@/data/APIschema";

type PartyType = components["schemas"]["PartyType"];

export const PARTY_TYPE: Record<PartyType, string> = {
	Individual: "Individual",
	Group: "Group",
	Project: "Project",
} as const;

export const PARTY_TYPE_OPTIONS = Object.entries(PARTY_TYPE).map(
	([value, label]) => ({
		value,
		label,
	}),
);
