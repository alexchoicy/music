import type { components } from "@/data/APIschema";

type ConcertFileType = components["schemas"]["ConcertFileType"];

export const CONCERT_FILE_TYPE: Record<ConcertFileType, string> = {
	Performance: "Performance",
	BehindTheScenes: "Behind The Scenes",
	Extra: "Extra",
	Other: "Other",
} as const;

export const CONCERT_FILE_TYPE_OPTIONS = Object.entries(CONCERT_FILE_TYPE).map(
	([value, label]) => ({
		value,
		label,
	}),
);
