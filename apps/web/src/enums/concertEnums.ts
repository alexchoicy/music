import type { components } from "#/data/APIschema";

import { enumOptions } from "./utils";

type ConcertFileType = components["schemas"]["ConcertFileType"];

export const CONCERT_FILE_TYPE: Record<ConcertFileType, string> = {
	Performance: "Performance",
	BehindTheScenes: "Behind the scenes",
	Extra: "Extra",
	Other: "Other",
};

export const CONCERT_FILE_TYPE_OPTIONS = enumOptions(CONCERT_FILE_TYPE);
