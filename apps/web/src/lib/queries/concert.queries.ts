import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const concertMutations = {
	create: () => ({
		mutationFn: async (data: components["schemas"]["CreateConcertModel"]) => {
			const result = await $APIFetch<
				components["schemas"]["CreateConcertUploadResult"]
			>("/concerts/create", {
				method: "POST",
				body: JSON.stringify(data),
			});

			if (!result.ok) {
				throw new Error("Failed to create concert");
			}

			return result;
		},
	}),
	createWithoutUpload: () => ({
		mutationFn: async (data: components["schemas"]["CreateConcertModel"]) => {
			const result = await $APIFetch<
				components["schemas"]["CreateConcertWithoutUploadResult"]
			>("/concerts/create-without-upload", {
				method: "POST",
				body: JSON.stringify(data),
			});

			if (!result.ok) {
				throw new Error("Failed to create concert");
			}

			return result;
		},
	}),
};
