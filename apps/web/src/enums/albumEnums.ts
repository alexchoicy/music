import type { components } from "#/data/APIschema";

import { enumOptions } from "./utils";

type AlbumType = components["schemas"]["AlbumType"];
type MediaSource = components["schemas"]["MediaSource"];

const ALBUM_TYPE: Record<AlbumType, string> = {
	Album: "Album",
	Single: "Single",
	Compilation: "Compilation",
	Live: "Live",
	Soundtrack: "Soundtrack",
	Remix: "Remix",
	Other: "Other",
} as const;

export const ALBUM_TYPE_OPTIONS = enumOptions(ALBUM_TYPE);

const MEDIA_SOURCE: Record<MediaSource, string> = {
	Unknown: "Unknown",
	UserUpload: "UserUpload",
	MORA: "MORA",
	OTOTOY: "OTOTOY",
	CD: "CD",
	BluRay: "BluRay",
	Vinyl: "Vinyl",
	YouTube: "YouTube",
	SoundCloud: "SoundCloud",
	Spotify: "Spotify",
	Twitter: "Twitter",
	Other: "Other",
};

export const MEDIA_SOURCE_OPTIONS = enumOptions(MEDIA_SOURCE);

const KEEP_AUDIO_SOURCE_OPTION_VALUE = "__keep__";

export type ReplaceAudioSourceOption = {
	id: MediaSource | null;
	label: string;
	value: string;
};

function makeReplaceAudioSourceOptions(): ReplaceAudioSourceOption[] {
	return [
		{
			id: null,
			label: "Keep current audio sources",
			value: KEEP_AUDIO_SOURCE_OPTION_VALUE,
		},
		...MEDIA_SOURCE_OPTIONS.map((option) => ({
			id: option.value,
			label: option.label,
			value: option.value,
		})),
	];
}

export const replaceAudioSourceOptions = makeReplaceAudioSourceOptions();
