import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const uploadQueries = {
	getPendingOriginalFiles: () =>
		queryOptions({
			queryKey: ["uploads", "pending-originals"],
			queryFn: async () => {
				const result =
					await $APIFetch<components["schemas"]["PendingOriginalFileResult"][]>(
						"/uploads",
					);

				if (!result.ok) throw new Error("Failed to load pending uploads");
				return result.data;
			},
		}),
};
