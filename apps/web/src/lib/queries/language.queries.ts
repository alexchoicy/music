import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "../APIFetchClient";

export const languageQueries = {
	getLanguages: () =>
		queryOptions({
			queryKey: ["languages"],
			staleTime: Infinity,
			gcTime: Infinity,
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<API.LanguageListItem[]>("/languages", {
					method: "GET",
					signal,
				});
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
