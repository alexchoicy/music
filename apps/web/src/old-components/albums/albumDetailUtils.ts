import type { components } from "#/data/APIschema";
import { getAlbumCoverUrl } from "#/lib/utils/album";

export type AlbumDetails = components["schemas"]["AlbumDetails"];
export type AlbumTrack = components["schemas"]["AlbumTrackDetails"];
export type PartyCredit =
	| AlbumDetails["credits"][number]
	| AlbumTrack["credits"][number];

export function getAlbumHoverCoverUrl(album: AlbumDetails) {
	return getAlbumCoverUrl(album.cover.discs[1]?.variants);
}

export function getCreditNames(credits: PartyCredit[]) {
	return credits.map((credit) => credit.name).join(", ");
}

export function getTrackCredits(album: AlbumDetails) {
	const credits = new Map<string, PartyCredit>();
	const albumCredits = new Set(
		album.credits.map((credit) => `${credit.partyId}-${credit.creditType}`),
	);

	for (const disc of album.discs) {
		for (const track of disc.tracks) {
			for (const credit of track.credits) {
				const key = `${credit.partyId}-${credit.creditType}`;
				if (!albumCredits.has(key)) credits.set(key, credit);
			}
		}
	}

	return Array.from(credits.values());
}

export function getContentTypeLabel(contentType: AlbumTrack["contentType"]) {
	return contentType === "MC" ? "Talk" : contentType;
}
