import type { components } from "#/data/APIschema";

import { enumOptions } from "./utils";

type AlbumType = components["schemas"]["AlbumType"];

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
