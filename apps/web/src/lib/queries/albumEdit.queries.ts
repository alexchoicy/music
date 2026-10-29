import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type AlbumEditDetails = API.AlbumEditDetails;
export type AlbumEditDisc = API.AlbumEditDisc;
export type AlbumEditTrack = API.AlbumEditTrack;
export type AlbumEditCover = API.AlbumEditCover;
export type UpdateAlbumDetailsRequest = API.UpdateAlbumDetailsRequest;
export type UpdateAlbumCoverRequest = API.UpdateAlbumCoverRequest;
export type UpdateAlbumCoverResult = API.UpdateAlbumCoverResult;
export type UpdateAlbumTracksRequest = API.UpdateAlbumTracksRequest;
export type AlbumEditTrackAudio = API.AlbumEditTrackAudio;
export type AddTrackAudioRequest = API.AddTrackAudioRequest;
export type AddTrackAudioResult = API.AddTrackAudioResult;
export type UpdateTrackAudiosRequest = API.UpdateTrackAudiosRequest;

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
				if (!result.ok)
					throw new ApiError("Unable to load album for editing", result.status);
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
	addTrackAudio: async (
		albumId: number | string,
		trackId: number | string,
		request: AddTrackAudioRequest,
	) => {
		const result = await $APIFetch<AddTrackAudioResult>(
			`/albums/${albumId}/tracks/${trackId}/audios`,
			{ method: "POST", body: JSON.stringify(request) },
		);
		if (!result.ok) throw result.error;
		return result.data;
	},
	updateTrackAudios: async (
		albumId: number | string,
		trackId: number | string,
		request: UpdateTrackAudiosRequest,
	) => {
		const result = await $APIFetch<AlbumEditDetails>(
			`/albums/${albumId}/tracks/${trackId}/audios`,
			{ method: "PUT", body: JSON.stringify(request) },
		);
		if (!result.ok) throw result.error;
		return result.data;
	},
	removeTrackAudio: async (
		albumId: number | string,
		trackId: number | string,
		trackAudioId: number | string,
	) => {
		const result = await $APIFetch<AlbumEditDetails>(
			`/albums/${albumId}/tracks/${trackId}/audios/${trackAudioId}`,
			{ method: "DELETE" },
		);
		if (!result.ok) throw result.error;
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
	void queryClient.invalidateQueries({ queryKey: ["playlists"] });
	void queryClient.invalidateQueries({ queryKey: ["history"] });
}
