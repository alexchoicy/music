import type * as API from "@music/api";

import { enumOptions } from "./utils";

type ConcertFileType = API.ConcertFileType;

export const CONCERT_FILE_TYPE: Record<ConcertFileType, string> = {
	Performance: "Performance",
	Extra: "Extra",
	BehindTheScenes: "Behind the scenes",
	Other: "Other",
};

export const CONCERT_FILE_TYPE_ORDER = Object.keys(
	CONCERT_FILE_TYPE,
) as ConcertFileType[];

export const CONCERT_FILE_TYPE_OPTIONS = enumOptions(CONCERT_FILE_TYPE);
