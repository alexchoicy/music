import type { components } from "#/data/APIschema";

import { normalizeString } from "./string";

export function splitArtists(artistString?: string): string[] {
	if (!artistString) return [];

	return artistString
		.split(/[/,;]+/)
		.map((a) => a.trim())
		.filter(Boolean)
		.filter((v, i, arr) => arr.indexOf(v) === i);
}

export function searchParty(
	parties: components["schemas"]["PartyItems"][],
	partyName: string,
) {
	const normalizedPartyName = normalizeString(partyName);

	return parties.find(
		(party) =>
			party.normalizedName === normalizedPartyName ||
			party.aliases.some(
				(alias) => alias.normalizedName === normalizedPartyName,
			),
	);
}

export function resolveParty(
	rawMetadata: string | undefined,
	parties: components["schemas"]["PartyItems"][],
) {
	const artists = splitArtists(rawMetadata);

	return artists.reduce<{
		albumParty: components["schemas"]["AlbumCreditRequest"][];
		unsolved: string[];
	}>(
		(acc, artist) => {
			const party = searchParty(parties, artist);

			if (party !== undefined) {
				acc.albumParty.push({
					partyId: party.partyId,
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
