import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const languageQueries = {
	getLanguages: () =>
		queryOptions({
			queryKey: ["languages"],
			staleTime: Infinity,
			gcTime: Infinity,
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<
					components["schemas"]["LanguageListItem"][]
				>("/languages", {
					method: "GET",
					signal,
				});
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
