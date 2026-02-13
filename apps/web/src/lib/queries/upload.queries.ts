import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const uploadMutations = {
	complete: {
		mutationFn: async (
			data: components["schemas"]["CompleteMultipartUploadRequest"][],
		) => {
			const result = await $APIFetch("/uploads/complete-multipart", {
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
