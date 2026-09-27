import type { components } from "#/data/APIschema";
import {
	formatDurationInHoursAndMinutes,
	formatMsToMMSSOrHMMSS,
} from "#/lib/utils/music";

export function createAlbumPreview(
	album: components["schemas"]["AlbumSummary"],
	albumUrl: string,
	trackId?: number,
) {
	const selectedDisc = album.discs.find((disc) =>
		disc.tracks.some((track) => Number(track.trackId) === trackId),
	);
	const selectedTrack = selectedDisc?.tracks.find(
		(track) => Number(track.trackId) === trackId,
	);
	const title = selectedTrack?.title ?? album.title;
	const image = selectedDisc?.coverUrl || album.coverUrl;
	const url = selectedTrack
		? `${albumUrl}?track=${selectedTrack.trackId}`
		: albumUrl;
	const credits = album.credits.join(", ");
	const description = [
		selectedTrack ? `${title} from ${album.title}.` : album.title,
		credits ? `Album credits: ${credits}` : "",
	]
		.filter(Boolean)
		.join(" ");
	const content =
		selectedTrack && selectedDisc
			? createTrackContent(album, selectedDisc, selectedTrack, albumUrl)
			: createAlbumContent(album, albumUrl);
	const heading = { type: 10, content: content.heading };
	const buttons = [
		{
			type: 2,
			style: 5,
			label: selectedTrack ? "Open track" : "Open album",
			url,
		},
	];

	if (selectedTrack) {
		buttons.push({ type: 2, style: 5, label: "View album", url: albumUrl });
	}

	return {
		title,
		description,
		image,
		url,
		embed: {
			component: {
				type: 17,
				accent_color: 0xd8aa65,
				components: [
					image
						? {
								type: 9,
								components: [heading],
								accessory: {
									type: 11,
									media: { url: image },
									description: `${album.title} artwork`,
								},
							}
						: heading,
					...(content.body
						? [
								{ type: 14, spacing: 1 },
								{ type: 10, content: content.body },
							]
						: []),
					{ type: 1, components: buttons },
				],
			},
		},
	};
}

function createAlbumContent(
	album: components["schemas"]["AlbumSummary"],
	albumUrl: string,
) {
	const tracks = album.discs.flatMap((disc) =>
		disc.tracks.map((track) => ({ disc, track })),
	);
	const durations = tracks.map(({ track }) => Number(track.durationInMs));
	const totalDuration = durations.every((value) => value > 0)
		? formatDurationInHoursAndMinutes(
				durations.reduce((total, value) => total + value, 0),
			)
		: null;
	const credits = album.credits.join(", ");
	const details = [
		`${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`,
		album.discs.length > 1 ? `${album.discs.length} discs` : null,
		totalDuration,
	];
	const heading = [
		"-# MUSIC · ALBUM",
		`## [${album.title}](${albumUrl})`,
		credits ? `Album credits: **${credits}**` : "",
		details.filter(Boolean).join(" · "),
	]
		.filter(Boolean)
		.join("\n");
	const previewTracks = tracks.slice(0, 3);
	const lines: string[] = [];

	for (const [index, { disc, track }] of previewTracks.entries()) {
		if (album.discs.length > 1 && disc !== previewTracks[index - 1]?.disc) {
			lines.push(`\n**Disc ${disc.discNumber}**`);
		}

		const duration = Number(track.durationInMs);
		const link = `${track.trackNumber}. [${track.title}](${albumUrl}?track=${track.trackId})`;
		lines.push(
			duration > 0 ? `${link} · ${formatMsToMMSSOrHMMSS(duration)}` : link,
		);
	}

	const remaining = tracks.length - previewTracks.length;
	if (remaining > 0) {
		lines.push(
			`\n-# +${remaining} more ${remaining === 1 ? "track" : "tracks"}`,
		);
	}

	return {
		heading,
		body: tracks.length > 0 ? `**Track list**\n${lines.join("\n")}` : "",
	};
}

function createTrackContent(
	album: components["schemas"]["AlbumSummary"],
	disc: components["schemas"]["AlbumSummaryDisc"],
	track: components["schemas"]["AlbumSummaryTrack"],
	albumUrl: string,
) {
	const duration = Number(track.durationInMs);
	const credits = album.credits.join(", ");
	const details = [
		duration > 0 ? formatMsToMMSSOrHMMSS(duration) : null,
		`Disc ${disc.discNumber}`,
		`Track ${track.trackNumber}`,
	];

	return {
		heading: [
			"-# MUSIC · TRACK",
			`## [${track.title}](${albumUrl}?track=${track.trackId})`,
			details.filter(Boolean).join(" · "),
		].join("\n"),
		body: [
			`From **[${album.title}](${albumUrl})**`,
			credits ? `Album credits: **${credits}**` : "",
		]
			.filter(Boolean)
			.join("\n"),
	};
}
