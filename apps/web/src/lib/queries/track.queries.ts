import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export async function downloadTrack(
	trackId: number | string,
	variant: components["schemas"]["FileObjectVariant"],
) {
	const result = await $APIFetch<
		components["schemas"]["AlbumTrackDownloadItemModel"]
	>(`/tracks/${trackId}/download?variant=${variant}`, {
		method: "GET",
	});

	if (!result.ok) {
		throw new Error("Failed to download track");
	}

	return result.data;
}
