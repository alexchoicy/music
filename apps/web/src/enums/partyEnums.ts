import type { components } from "@/data/APIschema";

type CountryCode = components["schemas"]["CountryCode"];
type PartyKind = components["schemas"]["PartyKind"];
type PartyType = components["schemas"]["PartyType"];

function enumOptions<Value extends string>(values: Record<Value, string>) {
	return Object.entries(values).map(([value, label]) => ({
		value: value as Value,
		label: label as string,
	}));
}

export const COUNTRY_CODE: Record<CountryCode, string> = {
	XX: "Unknown",
	HK: "Hong Kong",
	JP: "Japan",
	KR: "South Korea",
	US: "United States",
	CN: "China",
	TW: "Taiwan",
} as const;

export const COUNTRY_CODE_OPTIONS = enumOptions(COUNTRY_CODE);

export const PARTY_KIND: Record<PartyKind, string> = {
	Human: "Human",
	VTuber: "VTuber",
	Vocaloid: "Vocaloid",
} as const;

export const PARTY_KIND_OPTIONS = enumOptions(PARTY_KIND);

export const PARTY_TYPE: Record<PartyType, string> = {
	Individual: "Individual",
	Group: "Group",
	Project: "Project",
} as const;

export const PARTY_TYPE_OPTIONS = enumOptions(PARTY_TYPE);
