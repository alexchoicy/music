import type { components } from "@api/schema";

import type { ListSortOption } from "@/lib/listSort";

export type PartyType = components["schemas"]["PartyType"];
export type PartyKind = components["schemas"]["PartyKind"];
export type PartyGender = components["schemas"]["PartyGender"];
export type PartyDetails = components["schemas"]["PartyDetails"];
export type CountryCode = components["schemas"]["CountryCode"];

export const partyTypes: { label: string; value: PartyType }[] = [
	{ label: "Individual", value: "Individual" },
	{ label: "Group", value: "Group" },
	{ label: "Project", value: "Project" },
];

export const partyKinds: { label: string; value: PartyKind }[] = [
	{ label: "Human", value: "Human" },
	{ label: "VTuber", value: "VTuber" },
	{ label: "Vocaloid creator", value: "VocaloidCreator" },
	{ label: "Voice synth", value: "VoiceSynth" },
];

export const partyGenders: { label: string; value: PartyGender }[] = [
	{ label: "Male", value: "Male" },
	{ label: "Female", value: "Female" },
	{ label: "Unknown", value: "Unknown" },
];

export const partySortOptions: { label: string; value: ListSortOption }[] = [
	{ label: "Name A to Z", value: "TitleAsc" },
	{ label: "Name Z to A", value: "TitleDesc" },
	{ label: "Newest added", value: "CreatedAtDesc" },
	{ label: "Oldest added", value: "CreatedAtAsc" },
];

export const countryNames: Record<CountryCode, string> = {
	XX: "Unknown",
	HK: "Hong Kong",
	JP: "Japan",
	KR: "South Korea",
	US: "United States",
	CN: "China",
	TW: "Taiwan",
	ID: "Indonesia",
	UK: "United Kingdom",
};

const externalInfoLabels: Record<
	components["schemas"]["PartyExternalInfoType"],
	string
> = {
	Spotify: "Spotify",
	Twitter: "Twitter",
	OfficialWebsite: "Website",
	YouTube: "YouTube",
	YouTubeMusic: "YouTube Music",
	Instagram: "Instagram",
	AppleMusic: "Apple Music",
	Mora: "mora",
	Ototoy: "OTOTOY",
};

type ExternalInfoLink = components["schemas"]["PartyExternalInfoLink"];

/** Provider name, plus the URL's last path segment when the provider has several links. */
export function getExternalInfoLabel(
	link: ExternalInfoLink,
	links: ExternalInfoLink[],
) {
	const label = externalInfoLabels[link.type];
	if (links.filter((other) => other.type === link.type).length < 2) {
		return label;
	}

	const destination = link.url
		.replace(/^[a-z][a-z\d+.-]*:\/\/(www\.)?/i, "")
		.replace(/[?#].*$/, "")
		.replace(/\/+$/, "")
		.split("/")
		.at(-1);
	return destination ? `${label} · ${destination}` : label;
}

export function getPartyAvatar(
	image?: components["schemas"]["ImageFileVariants"] | null,
) {
	return image?.imageAvatar512x512 ?? image?.original ?? null;
}

/** Album sections on a party page, keyed by their See all route segment. */
export const partyAlbumSections = {
	albums: { title: "Albums", field: "albums" },
	"appears-on": { title: "Appears on", field: "appearsOnAlbums" },
} as const satisfies Record<
	string,
	{ title: string; field: "albums" | "appearsOnAlbums" }
>;

export type PartyAlbumSection = keyof typeof partyAlbumSections;

export function isPartyAlbumSection(
	value: string | undefined,
): value is PartyAlbumSection {
	return !!value && Object.hasOwn(partyAlbumSections, value);
}
