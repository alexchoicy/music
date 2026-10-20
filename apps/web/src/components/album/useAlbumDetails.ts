import { useQueries } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";
import { albumQueries } from "#/lib/queries/album.queries";

type AlbumDetails = components["schemas"]["AlbumDetails"];

function combineAlbums(results: UseQueryResult<AlbumDetails>[]) {
	const byId = new Map<string, AlbumDetails>();
	for (const result of results)
		if (result.data) byId.set(String(result.data.albumId), result.data);

	return {
		byId,
		isPending: results.some((result) => result.isPending),
		isError: results.some((result) => result.isError),
		refetchFailed: () => {
			for (const result of results) if (result.isError) void result.refetch();
		},
	};
}

export function useAlbumDetails(albumIds: (number | string)[]) {
	return useQueries({
		queries: [...new Set(albumIds.map(String))].map((albumId) =>
			albumQueries.getAlbum(albumId),
		),
		combine: combineAlbums,
	});
}
