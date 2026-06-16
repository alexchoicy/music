import type { components } from "#/data/APIschema";
import { getCoverUrl } from "#/lib/utils/album";

export type AlbumDetails = components["schemas"]["AlbumDetails"];
export type AlbumTrack = components["schemas"]["AlbumTrackDetails"];
export type PartyCredit =
	| AlbumDetails["credits"][number]
	| AlbumTrack["credits"][number];

export function getAlbumCoverUrl(album: AlbumDetails) {
	return (
		getCoverUrl(album.cover.album) ??
		getCoverUrl(album.cover.discs[0]?.variants)
	);
}

export function getAlbumHoverCoverUrl(album: AlbumDetails) {
	return getCoverUrl(album.cover.discs[1]?.variants);
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
