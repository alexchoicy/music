import type { components } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export const languageQueries = {
	getLanguages: () =>
		queryOptions({
			queryKey: ["languages"],
			queryFn: async () => {
				const result =
					await apiFetch<components["schemas"]["LanguageListItem"][]>(
						"/languages",
					);
				if (!result.ok) throw new Error("Unable to load languages");
				return result.data;
			},
			staleTime: 5 * 60 * 1000,
		}),
};
