import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const languageQueries = {
	getLanguages: () =>
		queryOptions({
			queryKey: ["languages"],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["LanguageListItem"][]
				>("/languages", {
					method: "GET",
				});
				return result;
			},
		}),
};
