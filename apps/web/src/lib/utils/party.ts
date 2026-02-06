import type { components } from "@/data/APIschema";
import { normalizeString } from "./upload";

export function splitArtists(artistString?: string): string[] {
	if (!artistString) return [];

	return artistString
		.split(/[/,;]+/)
		.map((a) => a.trim())
		.filter(Boolean)
		.filter((v, i, arr) => arr.indexOf(v) === i);
}

export function searchParty(
	parties: components["schemas"]["PartyListModel"][],
	partyName: string,
) {
	const normalizedPartyName = normalizeString(partyName);

	return parties.find(
		(party) =>
			party.partyNormalizedName === normalizedPartyName ||
			party.partyAliases.some(
				(alias) => alias.aliasNormalizedName === normalizedPartyName,
			),
	)?.partyId;
}

export function resolveParty(
	rawMetadata: string | undefined,
	parties: components["schemas"]["PartyListModel"][],
) {
	const artists = splitArtists(rawMetadata);

	return artists.reduce<{
		albumParty: components["schemas"]["AlbumCreditRequest"][];
		unsolved: string[];
	}>(
		(acc, artist) => {
			const id = searchParty(parties, artist);

			if (id !== undefined) {
				acc.albumParty.push({
					partyId: id,
					credit: "Artist",
				});
			} else {
				acc.unsolved.push(artist);
			}

			return acc;
		},
		{ albumParty: [], unsolved: [] },
	);
}
