import type * as API from "@music/api";

import { enumOptions } from "./utils";

type AlbumType = API.AlbumType;
type MediaSource = API.MediaSource;

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

export const MEDIA_SOURCE: Record<MediaSource, string> = {
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
