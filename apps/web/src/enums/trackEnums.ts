import type { components } from "#/data/APIschema";

import { enumOptions } from "./utils";

type TrackContentType = components["schemas"]["TrackContentType"];
type TrackVersionType = components["schemas"]["TrackVersionType"];

const TRACK_CONTENT_TYPE: Record<TrackContentType, string> = {
	Music: "Music",
	MC: "Talk",
	Interlude: "Interlude",
	Intro: "Intro",
};

export const TRACK_CONTENT_TYPE_OPTIONS = enumOptions(TRACK_CONTENT_TYPE);

const TRACK_VERSION_TYPE: Record<TrackVersionType, string> = {
	Original: "Original",
	Instrumental: "Instrumental",
	Remix: "Remix",
	Live: "Live",
	Acoustic: "Acoustic",
	RadioEdit: "Radio edit",
	Demo: "Demo",
	Other: "Other",
};

export const TRACK_VERSION_TYPE_OPTIONS = enumOptions(TRACK_VERSION_TYPE);
