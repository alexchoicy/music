import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type SubtitleSummary = API.SubtitleSummary;
export type SubtitleDetails = API.SubtitleDetails;
export type SubtitleLyrics = API.SubtitleLyrics;
export type SubtitleFormat = API.SubtitleFormat;
export type CreateSubtitleRequest = API.CreateSubtitleRequest;
export type UpdateSubtitleRequest = API.UpdateSubtitleRequest;

export type SubtitleOwner =
	| { kind: "track"; albumId: number | string; id: number | string }
	| { kind: "concertFile"; concertId: number | string; id: number | string };

function ownerPath(owner: SubtitleOwner) {
	return owner.kind === "track"
		? `/albums/${owner.albumId}/tracks/${owner.id}/subtitles`
		: `/concerts/${owner.concertId}/files/${owner.id}/subtitles`;
}

export const subtitleQueries = {
	getSubtitle: (subtitleId: number | string) =>
		queryOptions({
			queryKey: ["subtitles", String(subtitleId)],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<SubtitleDetails>(
					`/subtitles/${subtitleId}`,
					{ signal },
				);
				if (!result.ok)
					throw new ApiError("Unable to load subtitle", result.status);
				return result.data;
			},
		}),
	getLyrics: (subtitleId: number | string) =>
		queryOptions({
			queryKey: ["subtitles", String(subtitleId), "lyrics"],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<SubtitleLyrics>(
					`/subtitles/${subtitleId}/lyrics`,
					{ signal },
				);
				if (!result.ok)
					throw new ApiError("Unable to load lyrics", result.status);
				return result.data;
			},
		}),
};

export const subtitleActions = {
	create: async (owner: SubtitleOwner, request: CreateSubtitleRequest) => {
		const result = await $APIFetch<SubtitleDetails>(ownerPath(owner), {
			method: "POST",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
	update: async (
		subtitleId: number | string,
		request: UpdateSubtitleRequest,
	) => {
		const result = await $APIFetch<SubtitleDetails>(
			`/subtitles/${subtitleId}`,
			{ method: "PUT", body: JSON.stringify(request) },
		);
		if (result.status === 409)
			throw new Error(
				"This subtitle was changed somewhere else. Close and reopen it to get the latest version.",
			);
		if (!result.ok) throw result.error;
		return result.data;
	},
	remove: async (subtitleId: number | string) => {
		const result = await $APIFetch<null>(`/subtitles/${subtitleId}`, {
			method: "DELETE",
		});
		if (!result.ok) throw result.error;
	},
};
