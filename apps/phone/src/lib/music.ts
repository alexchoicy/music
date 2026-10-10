import type {
	AlbumDetails,
	AlbumListItem,
	AlbumTrack,
	AlbumType,
	CountryCode,
	ExternalInfoLink,
	FileObject,
	ImageVariants,
	ListSortOption,
	PartyGender,
	PartyKind,
	PartyType,
	TrackAudio,
} from "@/lib/schema";
import type { AudioQuality } from "@/store/settingsStore";

export const albumTypes: AlbumType[] = [
	"Album",
	"Single",
	"Compilation",
	"Live",
	"Soundtrack",
	"Remix",
	"Other",
];

export type Option<T extends string> = { label: string; value: T };

export const albumSortOptions: Option<ListSortOption>[] = [
	{ label: "Title A to Z", value: "TitleAsc" },
	{ label: "Title Z to A", value: "TitleDesc" },
	{ label: "Newest added", value: "CreatedAtDesc" },
	{ label: "Oldest added", value: "CreatedAtAsc" },
];

export const partySortOptions: Option<ListSortOption>[] = [
	{ label: "Name A to Z", value: "TitleAsc" },
	{ label: "Name Z to A", value: "TitleDesc" },
	{ label: "Newest added", value: "CreatedAtDesc" },
	{ label: "Oldest added", value: "CreatedAtAsc" },
];

export const partyTypes: Option<PartyType>[] = [
	{ label: "Individual", value: "Individual" },
	{ label: "Group", value: "Group" },
	{ label: "Project", value: "Project" },
];

export const partyKinds: Option<PartyKind>[] = [
	{ label: "Human", value: "Human" },
	{ label: "VTuber", value: "VTuber" },
	{ label: "Vocaloid creator", value: "VocaloidCreator" },
	{ label: "Voice synth", value: "VoiceSynth" },
];

export const partyGenders: Option<PartyGender>[] = [
	{ label: "Male", value: "Male" },
	{ label: "Female", value: "Female" },
	{ label: "Unknown", value: "Unknown" },
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

export function getCover(image: ImageVariants | null | undefined) {
	return image?.imageCover1024x1024 ?? image?.original ?? null;
}

export function getAvatar(image: ImageVariants | null | undefined) {
	return image?.imageAvatar512x512 ?? image?.original ?? null;
}

/** The cover of a disc, falling back to the album cover. */
export function getDiscCover(
	album: Pick<AlbumDetails, "cover">,
	albumDiscId: number | string,
) {
	const disc = album.cover.discs.find(
		(cover) => String(cover.albumDiscId) === String(albumDiscId),
	);
	return getCover(disc?.variants) ?? getCover(album.cover.album);
}

/** What an album tile shows; built from library results or a downloaded album. */
export type AlbumTile = {
	albumId: string;
	title: string;
	type: AlbumType;
	artists: string;
	cover: FileObject | null;
	/** Milliseconds; for downloads, when the album was downloaded. */
	addedAt: number;
};

export function joinNames(credits: readonly { name: string }[]) {
	return [...new Set(credits.map((credit) => credit.name))].join(", ");
}

export function toAlbumTile(album: AlbumListItem): AlbumTile {
	return {
		albumId: String(album.albumId),
		title: album.title,
		type: album.type,
		artists: joinNames(album.artists),
		// The first disc cover comes first, like the web library.
		cover:
			getCover(album.discCovers?.at(0)?.variants) ??
			getCover(album.coverVariants),
		addedAt: Date.parse(album.createdAt),
	};
}

/** Searches and sorts albums already on the device, e.g. downloads or a Party's releases. */
export function filterAlbumTiles(
	albums: AlbumTile[],
	search: string,
	sort: ListSortOption,
) {
	const query = search.trim().toLocaleLowerCase();
	const matches = query
		? albums.filter((album) =>
				[album.title, album.artists].some((text) =>
					text.toLocaleLowerCase().includes(query),
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
				return b.addedAt - a.addedAt;
			case "CreatedAtAsc":
				return a.addedAt - b.addedAt;
		}
	});
}

const versionLabels: Record<AlbumTrack["versionType"], string | null> = {
	Original: null,
	Instrumental: "Instrumental",
	Remix: "Remix",
	Live: "Live",
	Acoustic: "Acoustic",
	RadioEdit: "Radio edit",
	Demo: "Demo",
	Cover: "Cover",
	Other: "Other",
};

const contentLabels: Record<AlbumTrack["contentType"], string | null> = {
	Music: null,
	MC: "Talk",
	Interlude: "Interlude",
	Intro: "Intro",
};

/** Labels for tracks that are not original music, e.g. `Instrumental` or `Talk`. */
export function getTrackBadges(
	track: Pick<AlbumTrack, "versionType" | "contentType">,
) {
	return [
		versionLabels[track.versionType],
		contentLabels[track.contentType],
	].filter((label) => label !== null);
}

/** Track credits that the album credits do not already list with the same role. */
export function getTrackOnlyCredits(album: AlbumDetails) {
	const key = (credit: AlbumDetails["credits"][number]) =>
		`${credit.partyId}-${credit.creditType}`;
	const albumCredits = new Set(album.credits.map(key));
	const credits = new Map(
		album.discs
			.flatMap((disc) => disc.tracks.flatMap((track) => track.credits))
			.filter((credit) => !albumCredits.has(key(credit)))
			.map((credit) => [key(credit), credit]),
	);
	return [...credits.values()];
}

const externalInfoLabels: Record<ExternalInfoLink["type"], string> = {
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

/** The provider name, plus the URL's last path segment when the provider has several links. */
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

/** The source of a track that plays: pinned first, then the best rank. */
export function getPreferredAudio(track: Pick<AlbumTrack, "audios">) {
	return [...track.audios]
		.sort(
			(a, b) =>
				Number(b.pinned) - Number(a.pinned) || Number(a.rank) - Number(b.rank),
		)
		.at(0);
}

/** The file of a source at a quality; without Opus, the original. */
export function getAudioVariant(audio: TrackAudio, quality: AudioQuality) {
	return quality === "efficient"
		? (audio.file.opus96 ?? audio.file.original)
		: audio.file.original;
}

/** Formats the phone cannot decode, e.g. DSD. */
export function isUnplayableExtension(extension: string) {
	return /^\.?dsf$/i.test(extension);
}

/** The file to stream; an unplayable original falls back to Opus. */
export function getPlaybackFile(audio: TrackAudio, quality: AudioQuality) {
	const file = getAudioVariant(audio, quality);
	return isUnplayableExtension(file.extension) && audio.file.opus96
		? audio.file.opus96
		: file;
}

/** Album sections on a Party page, keyed by their See all route segment. */
export const partyAlbumSections = {
	albums: { title: "Albums", field: "albums" },
	"appears-on": { title: "Appears on", field: "appearsOnAlbums" },
} as const;

export type PartyAlbumSection = keyof typeof partyAlbumSections;

export function isPartyAlbumSection(
	value: string | undefined,
): value is PartyAlbumSection {
	return !!value && Object.hasOwn(partyAlbumSections, value);
}
