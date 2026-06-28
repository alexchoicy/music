import type { components } from "#/data/APIschema";
import type { CreditRequest, PartyItem } from "#/store/albumUploadStoreType";

import { checkIfVariousArtists } from "./music";
import { normalizeString } from "./string";

function splitArtists(artistString?: string): string[] {
	if (!artistString) return [];

	return artistString
		.trim()
		.replace(
			/\s*[（(]\s*[CcＣｃ][VvＶｖ][.．]?\s*[:：]?[^（）()]*[）)]\s*$/u,
			"",
		)
		.split(/\s*(?:;|\bfeat\.?(?=\s|$)|\bft\.?(?=\s|$)|\bfeaturing\b)\s*/i)
		.map((artist) => artist.trim())
		.filter(Boolean);
}

export function searchPartyByNormalizedName(
	parties: components["schemas"]["PartyItems"][],
	normalizedPartyName: string,
) {
	return parties.find(
		(party) =>
			party.normalizedName === normalizedPartyName ||
			party.aliases.some(
				(alias) => alias.normalizedName === normalizedPartyName,
			),
	);
}

export function resolveParty(
	rawMetadata: string[],
	parties: components["schemas"]["PartyItems"][],
) {
	const artists = rawMetadata.flatMap((artist) => splitArtists(artist));
	const hasVariousArtists = rawMetadata.some(checkIfVariousArtists);

	const albumParty: CreditRequest[] = [];
	const unsolved: string[] = [];

	const seenPartyIds = new Set<PartyItem["partyId"]>();

	for (const artist of artists) {
		const party = searchPartyByNormalizedName(parties, normalizeString(artist));

		if (party === undefined) {
			unsolved.push(artist);
			continue;
		}

		if (seenPartyIds.has(party.partyId)) {
			continue;
		}

		seenPartyIds.add(party.partyId);

		albumParty.push({
			partyId: party.partyId,
			credit: "Artist",
		});
	}

	return {
		albumParty,
		unsolved,
		hasVariousArtists,
	};
}

export function getCreditNames(
	parties: PartyItem[],
	credits: CreditRequest[],
): string[] {
	const partyNameById = new Map(
		parties.map((party) => [party.partyId, party.name]),
	);

	return credits.map(
		(credit) => partyNameById.get(credit.partyId) ?? "Unknown artist",
	);
}

export function getPartyAvatarUrl(
	image?: components["schemas"]["ImageFileVariants"] | null,
): string | null {
	return image?.imageAvatar512x512?.url ?? image?.original?.url ?? null;
}
