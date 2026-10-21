import type * as API from "@music/api";

import { $APIFetch } from "../APIFetchClient";

type CreateAlbumRequest = API.CreateAlbumRequest;
type CreateAlbumResult = API.CreateAlbumResult;

export async function createAlbums(request: CreateAlbumRequest[]) {
	const result = await $APIFetch<CreateAlbumResult[]>("/albums", {
		method: "POST",
		body: JSON.stringify(request),
	});

	if (result.ok) return result.data;

	if (Array.isArray(result.error.cause))
		return result.error.cause as CreateAlbumResult[];

	throw result.error;
}
