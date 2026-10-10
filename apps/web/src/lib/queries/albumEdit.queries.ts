import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type AlbumEditDetails = components["schemas"]["AlbumEditDetails"];
export type AlbumEditDisc = components["schemas"]["AlbumEditDisc"];
export type AlbumEditTrack = components["schemas"]["AlbumEditTrack"];
export type AlbumEditCover = components["schemas"]["AlbumEditCover"];
export type UpdateAlbumDetailsRequest =
	components["schemas"]["UpdateAlbumDetailsRequest"];
export type UpdateAlbumCoverRequest =
	components["schemas"]["UpdateAlbumCoverRequest"];
export type UpdateAlbumCoverResult =
	components["schemas"]["UpdateAlbumCoverResult"];
export type UpdateAlbumTracksRequest =
	components["schemas"]["UpdateAlbumTracksRequest"];

function toError(error: Error, status: number) {
	if (status === 409) {
		return new Error(
			"This album was changed somewhere else. Reload the page to get the latest version.",
		);
	}
	return error;
}

export const albumEditQueries = {
	getAlbumEdit: (albumId: number | string) =>
		queryOptions({
			queryKey: ["albums", String(albumId), "edit"],
			queryFn: async () => {
				const result = await $APIFetch<AlbumEditDetails>(
					`/albums/${albumId}/edit`,
				);
				if (!result.ok) throw new Error("Unable to load album for editing");
				return result.data;
			},
		}),
};

export const albumEditActions = {
	updateDetails: async (
		albumId: number | string,
		request: UpdateAlbumDetailsRequest,
	) => {
		const result = await $APIFetch<AlbumEditDetails>(`/albums/${albumId}`, {
			method: "PATCH",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw toError(result.error, result.status);
		return result.data;
	},
	updateCover: async (
		albumId: number | string,
		request: UpdateAlbumCoverRequest,
	) => {
		const result = await $APIFetch<UpdateAlbumCoverResult>(
			`/albums/${albumId}/cover`,
			{ method: "PUT", body: JSON.stringify(request) },
		);
		if (!result.ok) throw toError(result.error, result.status);
		return result.data;
	},
	updateTracks: async (
		albumId: number | string,
		request: UpdateAlbumTracksRequest,
	) => {
		const result = await $APIFetch<AlbumEditDetails>(
			`/albums/${albumId}/tracks`,
			{ method: "PUT", body: JSON.stringify(request) },
		);
		if (!result.ok) throw toError(result.error, result.status);
		return result.data;
	},
};

// Store the fresh edit state and refresh every view of the album
export function applyAlbumEdit(
	queryClient: QueryClient,
	albumId: number | string,
	album: AlbumEditDetails,
) {
	queryClient.setQueryData(
		albumEditQueries.getAlbumEdit(albumId).queryKey,
		album,
	);
	void queryClient.invalidateQueries({
		queryKey: ["albums"],
		predicate: (query) => query.queryKey[2] !== "edit",
	});
}
