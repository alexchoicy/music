import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const albumQueries = {
	list: (apiEndpoint: string) =>
		queryOptions({
			queryKey: ["albums", apiEndpoint],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AlbumListItemModel"][]
				>(apiEndpoint, "/albums", {
					method: "GET",
				});
				if (!result.ok) return [];
				return result.data;
			},
		}),
	item: (apiEndpoint: string, albumId: string) =>
		queryOptions({
			queryKey: ["albums", apiEndpoint, albumId],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AlbumDetailsModel"]
				>(apiEndpoint, `/albums/${albumId}`, {
					method: "GET",
				});
				if (!result.ok) throw new Error("Failed to fetch album");
				return result.data;
			},
		}),
};

export const albumMutations = {
	create: (apiEndpoint: string) => ({
		mutationFn: async (data: components["schemas"]["CreateAlbumRequest"][]) => {
			const result = await $APIFetch<
				components["schemas"]["CreateAlbumResult"][]
			>(apiEndpoint, "/albums", {
				method: "POST",
				body: JSON.stringify(data),
			});

			if (!result.ok) {
				throw new Error("Failed to create party");
			}

			return result;
		},
	}),
};
