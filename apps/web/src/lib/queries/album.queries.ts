import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const albumQueries = {
	list: () =>
		queryOptions({
			queryKey: ["albums"],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AlbumListItemModel"][]
				>("/albums", {
					method: "GET",
				});
				if (!result.ok) return [];
				return result.data;
			},
		}),
	item: (albumId: string) =>
		queryOptions({
			queryKey: ["albums", albumId],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AlbumDetailsModel"]
				>(`/albums/${albumId}`, {
					method: "GET",
				});
				if (!result.ok) throw new Error("Failed to fetch album");
				return result.data;
			},
		}),
};

export const albumMutations = {
	create: () => ({
		mutationFn: async (data: components["schemas"]["CreateAlbumRequest"][]) => {
			const result = await $APIFetch<
				components["schemas"]["CreateAlbumResult"][]
			>("/albums", {
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
