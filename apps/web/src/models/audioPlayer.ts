import type { components } from "@/data/APIschema";

export type AudioPlayerItem = {
	albumId: number;
	albumTitle: string;
	albumCoverUrl?: string;
	durationInMs: number;

	trackId: number;
	trackTitle: string;
	artists: string[];

	sources: components["schemas"]["TrackSourceDetailsModel"][];
};
