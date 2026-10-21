import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "../APIFetchClient";

export const uploadQueries = {
	getPendingOriginalFiles: () =>
		queryOptions({
			queryKey: ["uploads", "pending-originals"],
			queryFn: async () => {
				const result =
					await $APIFetch<API.PendingOriginalFileResult[]>("/uploads");

				if (!result.ok) throw new Error("Failed to load pending uploads");
				return result.data;
			},
		}),
};
