import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const albumMutations = {
	create: {
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
	},
};
