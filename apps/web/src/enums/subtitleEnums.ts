import type * as API from "@music/api";

import { enumOptions } from "./utils";

type SubtitleFormat = API.SubtitleFormat;

export const SUBTITLE_FORMAT: Record<SubtitleFormat, string> = {
	PlainText: "Plain text",
	Vtt: "WebVTT",
	Srt: "SRT",
	Lrc: "LRC",
	Ass: "ASS",
	Ttml: "TTML",
};

export const SUBTITLE_FORMAT_OPTIONS = enumOptions(SUBTITLE_FORMAT);

export const SUBTITLE_FORMAT_BY_EXTENSION: Record<string, SubtitleFormat> = {
	txt: "PlainText",
	vtt: "Vtt",
	srt: "Srt",
	lrc: "Lrc",
	ass: "Ass",
	ssa: "Ass",
	ttml: "Ttml",
	dfxp: "Ttml",
	xml: "Ttml",
};

export const TRACK_SUBTITLE_FORMATS: SubtitleFormat[] = [
	"Lrc",
	"Ttml",
	"PlainText",
];

export const SYNCED_LYRICS_FORMATS: SubtitleFormat[] = ["Lrc", "Ttml"];

export const CONCERT_SUBTITLE_FORMATS: SubtitleFormat[] = [
	"Vtt",
	"Srt",
	"Ass",
	"Ttml",
];

export function subtitleFormatsFor(owner: "track" | "concertFile") {
	const formats =
		owner === "concertFile" ? CONCERT_SUBTITLE_FORMATS : TRACK_SUBTITLE_FORMATS;
	return {
		formats,
		options: SUBTITLE_FORMAT_OPTIONS.filter((option) =>
			formats.includes(option.value),
		),
		accept: Object.entries(SUBTITLE_FORMAT_BY_EXTENSION)
			.filter(([, format]) => formats.includes(format))
			.map(([extension]) => `.${extension}`)
			.join(","),
	};
}
