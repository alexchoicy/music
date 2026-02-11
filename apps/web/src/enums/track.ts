import type { components } from "@/data/APIschema";

type TrackVariantType = components["schemas"]["TrackVariantType"];

export const TRACK_VARIANT_TYPES: { value: TrackVariantType; label: string }[] =
	[
		{ value: "Default", label: "Default" },
		{ value: "Instrumental", label: "Instrumental" },
	];

type FileSource = components["schemas"]["TrackSource"];

export const FILE_SOURCES: { value: FileSource; label: string }[] = [
	{ value: "MORA", label: "MORA" },
	{ value: "OTOTOY", label: "OTOTOY" },
	{ value: "CD", label: "CD" },
	{ value: "BluRay", label: "BluRay" },
	{ value: "Vinyl", label: "Vinyl" },
	{ value: "YouTube", label: "YouTube" },
	{ value: "SoundCloud", label: "SoundCloud" },
	{ value: "OTHER", label: "OTHER" },
];
