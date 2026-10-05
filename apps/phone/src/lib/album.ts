import type { components } from "@api/schema";

import type { ListSortOption } from "@/lib/listSort";

export type AlbumType = components["schemas"]["AlbumType"];

export const albumTypes: AlbumType[] = [
	"Album",
	"Single",
	"Compilation",
	"Live",
	"Soundtrack",
	"Remix",
	"Other",
];

export function getAlbumCover(
	image?: components["schemas"]["ImageFileVariants"] | null,
) {
	return image?.imageCover1024x1024 ?? image?.original ?? null;
}

export type AlbumDetails = components["schemas"]["AlbumDetails"];
export type AlbumTrack = components["schemas"]["AlbumTrackDetails"];
export type AlbumCredit =
	| AlbumDetails["credits"][number]
	| AlbumTrack["credits"][number];

const trackVersionLabels: Record<AlbumTrack["versionType"], string> = {
	Original: "Original",
	Instrumental: "Instrumental",
	Remix: "Remix",
	Live: "Live",
	Acoustic: "Acoustic",
	RadioEdit: "Radio edit",
	Demo: "Demo",
	Other: "Other",
};

const trackContentLabels: Record<AlbumTrack["contentType"], string> = {
	Music: "Music",
	MC: "Talk",
	Interlude: "Interlude",
	Intro: "Intro",
};

/** Badges for tracks that are not original music, e.g. `Instrumental` or `Talk`. */
export function getTrackBadges(track: AlbumTrack) {
	return [
		track.versionType !== "Original"
			? trackVersionLabels[track.versionType]
			: null,
		track.contentType !== "Music"
			? trackContentLabels[track.contentType]
			: null,
	].filter((label): label is string => label !== null);
}

/** Track credits that are not already album credits with the same role. */
export function getTrackOnlyCredits(album: AlbumDetails) {
	const albumCredits = new Set(
		album.credits.map((credit) => `${credit.partyId}-${credit.creditType}`),
	);
	const credits = new Map<string, AlbumCredit>();

	for (const disc of album.discs) {
		for (const track of disc.tracks) {
			for (const credit of track.credits) {
				const key = `${credit.partyId}-${credit.creditType}`;
				if (!albumCredits.has(key)) credits.set(key, credit);
			}
		}
	}

	return [...credits.values()];
}

// Release dates are calendar dates, so they are shown in UTC to avoid shifting a day.
const releaseDateFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});

export function formatReleaseDate(value?: string | null) {
	return value ? releaseDateFormatter.format(new Date(value)) : null;
}

/** Searches and sorts albums already loaded on the client, such as a party's releases. */
export function filterAlbums(
	albums: components["schemas"]["AlbumListItem"][],
	search: string,
	sort: ListSortOption,
) {
	const query = search.trim().toLocaleLowerCase();
	const matches = query
		? albums.filter((album) =>
				[album.title, ...album.artists.map((artist) => artist.name)].some(
					(text) => text.toLocaleLowerCase().includes(query),
				),
			)
		: [...albums];

	return matches.sort((a, b) => {
		switch (sort) {
			case "TitleAsc":
				return a.title.localeCompare(b.title);
			case "TitleDesc":
				return b.title.localeCompare(a.title);
			case "CreatedAtDesc":
				return Date.parse(b.createdAt) - Date.parse(a.createdAt);
			case "CreatedAtAsc":
				return Date.parse(a.createdAt) - Date.parse(b.createdAt);
		}
	});
}
