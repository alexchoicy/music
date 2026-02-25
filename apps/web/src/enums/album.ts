import type { components } from "@/data/APIschema";

type AlbumType = components["schemas"]["AlbumType"];

export const ALBUM_TYPES: { value: AlbumType; label: string }[] = [
	{ value: "Album", label: "Album" },
	{ value: "Single", label: "Single" },
	{ value: "Compilation", label: "Compilation" },
	{ value: "Live", label: "Live" },
	{ value: "Remix", label: "Remix" },
	{ value: "Soundtrack", label: "Soundtrack" },
	{ value: "Other", label: "Other" },
];
