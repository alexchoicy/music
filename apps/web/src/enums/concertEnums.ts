import type * as API from "@music/api";

import { enumOptions } from "./utils";

type ConcertFileType = API.ConcertFileType;

export const CONCERT_FILE_TYPE: Record<ConcertFileType, string> = {
	Performance: "Performance",
	BehindTheScenes: "Behind the scenes",
	Extra: "Extra",
	Other: "Other",
};

export const CONCERT_FILE_TYPE_OPTIONS = enumOptions(CONCERT_FILE_TYPE);
