import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

type CreateAlbumRequest = components["schemas"]["CreateAlbumRequest"];
type CreateAlbumResult = components["schemas"]["CreateAlbumResult"];

export async function createAlbums(request: CreateAlbumRequest[]) {
	const result = await $APIFetch<CreateAlbumResult[]>("/albums", {
		method: "POST",
		body: JSON.stringify(request),
	});

	if (result.ok) return result.data;

	if (Array.isArray(result.error)) return result.error as CreateAlbumResult[];

	throw new Error(
		typeof result.error === "string" ? result.error : "Failed to create albums",
	);
}
