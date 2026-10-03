import type { components } from "#/data/APIschema";
import {
	formatDurationInHoursAndMinutes,
	formatMsToMMSSOrHMMSS,
} from "#/lib/utils/music";

type AlbumSummary = components["schemas"]["AlbumSummary"];
type AlbumSummaryDisc = components["schemas"]["AlbumSummaryDisc"];
type AlbumSummaryTrack = components["schemas"]["AlbumSummaryTrack"];

// Discord message component types (Components V2).
type TextDisplay = { type: 10; content: string };
type Thumbnail = { type: 11; media: { url: string }; description: string };
type Section = { type: 9; components: TextDisplay[]; accessory: Thumbnail };
type Separator = { type: 14; divider: boolean; spacing: 1 | 2 };
type LinkButton = { type: 2; style: 5; label: string; url: string };
type ActionRow = { type: 1; components: LinkButton[] };
type Container = {
	type: 17;
	accent_color: number;
	components: (TextDisplay | Section | Separator | ActionRow)[];
};

export const PREVIEW_ACCENT_COLOR = "#d8aa65";

// Discord shows roughly 350 characters of og:description.
const DESCRIPTION_LIMIT = 350;
const ALBUM_TRACK_LIMIT = 10;
const TRACK_CONTEXT = 2;

export type AlbumPreview = {
	type: "music.album" | "music.song";
	title: string;
	description: string;
	url: string;
	image: string | null;
	imageAlt: string;
	durationInSeconds: number | null;
	embed: { component: Container };
};

export function createAlbumPreview(
	album: AlbumSummary,
	albumUrl: string,
	trackId?: number,
): AlbumPreview {
	for (const disc of album.discs) {
		const track = disc.tracks.find((item) => Number(item.trackId) === trackId);

		if (track) {
			return createTrackPreview(album, disc, track, albumUrl);
		}
	}

	return createAlbumOnlyPreview(album, albumUrl);
}

function createAlbumOnlyPreview(
	album: AlbumSummary,
	albumUrl: string,
): AlbumPreview {
	const isMultiDisc = album.discs.length > 1;
	const tracks = album.discs.flatMap((disc) =>
		disc.tracks.map((track) => ({ disc, track })),
	);
	const durations = tracks.map(({ track }) => Number(track.durationInMs));
	const totalDuration = durations.every((value) => value > 0)
		? durations.reduce((total, value) => total + value, 0)
		: null;
	const image = album.coverUrl || null;
	const imageAlt = `${album.title} cover`;
	const stats = joinParts([
		`${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`,
		isMultiDisc ? `${album.discs.length} discs` : null,
		formatDurationInHoursAndMinutes(totalDuration),
	]);

	const heading = joinLines([
		`-# ALBUM · ${stats}`,
		`## [${escapeMarkdown(album.title)}](${albumUrl})`,
		formatCreditsMarkdown(album.credits, "Credits"),
	]);

	const shownTracks = tracks.slice(0, ALBUM_TRACK_LIMIT);
	const remaining = tracks.length - shownTracks.length;
	const trackListLines: string[] = [];

	for (const [index, { disc, track }] of shownTracks.entries()) {
		if (isMultiDisc && disc !== shownTracks[index - 1]?.disc) {
			trackListLines.push(`-# DISC ${disc.discNumber}`);
		}

		trackListLines.push(formatTrackLine(disc, track, albumUrl, false));
	}

	if (remaining > 0) {
		trackListLines.push(
			`-# +${remaining} more ${remaining === 1 ? "track" : "tracks"} · [Full tracklist](${albumUrl})`,
		);
	}

	const ogHeader = joinLines([
		`Album · ${stats}`,
		formatCredits(album.credits, "Credits"),
	]);
	const ogTrackLines = tracks.map(({ disc, track }) => {
		const number = isMultiDisc
			? `${disc.discNumber}-${track.trackNumber}`
			: `${track.trackNumber}`;

		return joinParts([`${number}. ${track.title}`, formatTrackDuration(track)]);
	});

	return {
		type: "music.album",
		title: album.title,
		description: fitTrackList(ogHeader, ogTrackLines),
		url: albumUrl,
		image,
		imageAlt,
		durationInSeconds: toSeconds(totalDuration),
		embed: createEmbed({
			heading,
			image,
			imageAlt,
			body: joinLines(trackListLines),
			buttons: [{ label: "Open album", url: albumUrl }],
		}),
	};
}

function createTrackPreview(
	album: AlbumSummary,
	disc: AlbumSummaryDisc,
	track: AlbumSummaryTrack,
	albumUrl: string,
): AlbumPreview {
	const isMultiDisc = album.discs.length > 1;
	const duration = Number(track.durationInMs);
	const trackUrl = getTrackUrl(albumUrl, track);
	const image = disc.coverUrl || album.coverUrl || null;
	const imageAlt = `${album.title} cover`;
	const position = joinParts([
		isMultiDisc ? `Disc ${disc.discNumber}` : null,
		`Track ${track.trackNumber}`,
	]);

	const details = joinParts([
		formatTrackDuration(track),
		formatCredits(album.credits.map(escapeMarkdown), "Album credits"),
	]);
	const heading = joinLines([
		`-# TRACK · ${position}`,
		`## [${escapeMarkdown(track.title)}](${trackUrl})`,
		`from **[${escapeMarkdown(album.title)}](${albumUrl})**`,
		details ? `-# ${details}` : null,
	]);

	// Show the selected track with its neighbours on the same disc.
	const index = disc.tracks.indexOf(track);
	const contextTracks = disc.tracks.slice(
		Math.max(0, index - TRACK_CONTEXT),
		index + TRACK_CONTEXT + 1,
	);
	const body = joinLines([
		isMultiDisc ? `-# DISC ${disc.discNumber}` : "-# TRACKLIST",
		...contextTracks.map((item) =>
			formatTrackLine(disc, item, albumUrl, item === track),
		),
	]);

	const ogDescription = joinLines([
		joinParts(["Track", position, formatTrackDuration(track)]),
		`From ${album.title}`,
		formatCredits(album.credits, "Album credits"),
	]);

	return {
		type: "music.song",
		title: track.title,
		description: truncate(ogDescription, DESCRIPTION_LIMIT),
		url: trackUrl,
		image,
		imageAlt,
		durationInSeconds: toSeconds(duration > 0 ? duration : null),
		embed: createEmbed({
			heading,
			image,
			imageAlt,
			body,
			buttons: [
				{ label: "Open track", url: trackUrl },
				{ label: "View album", url: albumUrl },
			],
		}),
	};
}

function createEmbed({
	heading,
	image,
	imageAlt,
	body,
	buttons,
}: {
	heading: string;
	image: string | null;
	imageAlt: string;
	body: string;
	buttons: { label: string; url: string }[];
}) {
	const headingText: TextDisplay = { type: 10, content: heading };
	const components: Container["components"] = [
		image
			? {
					type: 9,
					components: [headingText],
					accessory: {
						type: 11,
						media: { url: image },
						description: imageAlt,
					},
				}
			: headingText,
	];

	if (body) {
		components.push(
			{ type: 14, divider: true, spacing: 1 },
			{ type: 10, content: body },
		);
	}

	components.push({
		type: 1,
		components: buttons.map((button) => ({ type: 2, style: 5, ...button })),
	});

	return {
		component: {
			type: 17,
			accent_color: Number.parseInt(PREVIEW_ACCENT_COLOR.slice(1), 16),
			components,
		} satisfies Container,
	};
}

function formatTrackLine(
	disc: AlbumSummaryDisc,
	track: AlbumSummaryTrack,
	albumUrl: string,
	selected: boolean,
) {
	const width = Math.max(
		2,
		...disc.tracks.map((item) => String(item.trackNumber).length),
	);
	const number = String(track.trackNumber).padStart(width, "0");
	const title = `[${escapeMarkdown(track.title)}](${getTrackUrl(albumUrl, track)})`;
	const duration = formatTrackDuration(track);
	const line = joinParts([
		`\`${number}\` ${selected ? `**${title}**` : title}`,
		duration ? `\`${duration}\`` : null,
	]);

	return selected ? `▸ ${line}` : line;
}

function fitTrackList(header: string, trackLines: string[]) {
	if (trackLines.length === 0) {
		return truncate(header, DESCRIPTION_LIMIT);
	}

	for (let count = trackLines.length; count > 0; count--) {
		const remaining = trackLines.length - count;
		const description = [
			header,
			"",
			...trackLines.slice(0, count),
			remaining > 0
				? `+${remaining} more ${remaining === 1 ? "track" : "tracks"}`
				: null,
		]
			.filter((line) => line !== null)
			.join("\n");

		if (description.length <= DESCRIPTION_LIMIT) {
			return description;
		}
	}

	return truncate(header, DESCRIPTION_LIMIT);
}

function getTrackUrl(albumUrl: string, track: AlbumSummaryTrack) {
	return `${albumUrl}?track=${track.trackId}`;
}

function formatCredits(credits: string[], label: string) {
	return credits.length > 0 ? `${label}: ${credits.join(", ")}` : null;
}

function formatCreditsMarkdown(credits: string[], label: string) {
	return credits.length > 0
		? `${label}: ${credits.map((name) => `**${escapeMarkdown(name)}**`).join(", ")}`
		: null;
}

function formatTrackDuration(track: AlbumSummaryTrack) {
	const duration = Number(track.durationInMs);

	return duration > 0 ? formatMsToMMSSOrHMMSS(duration) : null;
}

function escapeMarkdown(value: string) {
	return value.replace(/[\\*_`~|[\]<>]/g, "\\$&");
}

function joinParts(parts: (string | null)[]) {
	return parts.filter(Boolean).join(" · ");
}

function joinLines(lines: (string | null)[]) {
	return lines.filter(Boolean).join("\n");
}

function toSeconds(durationInMs: number | null) {
	return durationInMs === null ? null : Math.round(durationInMs / 1000);
}

function truncate(value: string, limit: number) {
	return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
