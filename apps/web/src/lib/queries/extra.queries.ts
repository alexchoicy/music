import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export type ExtraDetails = components["schemas"]["ExtraDetails"];
export type ExtraAssetDetails = components["schemas"]["ExtraAssetDetails"];
export type SaveExtraRequest = components["schemas"]["SaveExtraRequest"];
export type SaveExtraResult = components["schemas"]["SaveExtraResult"];

export const extraQueries = {
	getAlbumExtras: (albumId: number | string) =>
		queryOptions({
			queryKey: ["albums", String(albumId), "extras"],
			queryFn: async () => {
				const result = await $APIFetch<ExtraDetails[]>(
					`/albums/${albumId}/extras`,
				);
				if (!result.ok) throw new Error("Unable to load extras");
				return result.data;
			},
		}),
};

// Extras are listed by their own query and embedded in the album details
export function invalidateAlbumExtras(
	queryClient: QueryClient,
	albumId: number | string,
) {
	return queryClient.invalidateQueries({
		predicate: ({ queryKey }) =>
			queryKey[0] === "albums" &&
			String(queryKey[1]) === String(albumId) &&
			(queryKey.length === 2 || queryKey[2] === "extras"),
	});
}

export const extraActions = {
	createForAlbum: async (
		albumId: number | string,
		request: SaveExtraRequest,
	) => {
		const result = await $APIFetch<SaveExtraResult>(
			`/albums/${albumId}/extras`,
			{ method: "POST", body: JSON.stringify(request) },
		);
		if (!result.ok) throw result.error;
		return result.data;
	},
	update: async (extraId: string, request: SaveExtraRequest) => {
		const result = await $APIFetch<SaveExtraResult>(`/extras/${extraId}`, {
			method: "PUT",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
	delete: async (extraId: string) => {
		const result = await $APIFetch<void>(`/extras/${extraId}`, {
			method: "DELETE",
		});
		if (!result.ok) throw result.error;
	},
};
