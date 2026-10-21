import type * as API from "@music/api";

import { enumOptions } from "./utils";

type CountryCode = API.CountryCode;
type PartyGender = API.PartyGender;
type PartyKind = API.PartyKind;
type PartyType = API.PartyType;

export const COUNTRY_CODE: Record<CountryCode, string> = {
	XX: "Unknown",
	HK: "Hong Kong",
	JP: "Japan",
	KR: "South Korea",
	US: "United States",
	CN: "China",
	TW: "Taiwan",
	ID: "Indonesia",
	UK: "United Kingdom",
} as const;

export const COUNTRY_CODE_OPTIONS = enumOptions(COUNTRY_CODE);

export const PARTY_KIND: Record<PartyKind, string> = {
	Human: "Human",
	VTuber: "VTuber",
	VocaloidCreator: "Vocaloid creator",
	VoiceSynth: "Voice synth",
} as const;

export const PARTY_KIND_OPTIONS = enumOptions(PARTY_KIND);

export const PARTY_GENDER: Record<PartyGender, string> = {
	Unknown: "Unknown",
	Male: "Male",
	Female: "Female",
} as const;

export const PARTY_GENDER_OPTIONS = enumOptions(PARTY_GENDER);

export const PARTY_TYPE: Record<PartyType, string> = {
	Individual: "Individual",
	Group: "Group",
	Project: "Project",
} as const;

export const PARTY_TYPE_OPTIONS = enumOptions(PARTY_TYPE);
