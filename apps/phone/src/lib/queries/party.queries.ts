import type { components, paths } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export type PartyQuery = paths["/parties"]["get"]["parameters"]["query"];

function toQueryString(query: PartyQuery = {}) {
	const params: string[] = [];
	const append = (key: string, value: string | number) =>
		params.push(`${key}=${encodeURIComponent(value)}`);

	if (query.Search) append("Search", query.Search);
	if (query.Country) append("Country", query.Country);
	if (query.Type) append("Type", query.Type);
	if (query.Kind) append("Kind", query.Kind);
	if (query.Gender) append("Gender", query.Gender);
	if (query.ExcludeNoAlbums) append("ExcludeNoAlbums", "true");
	if (query.Sort) append("Sort", query.Sort);
	if (query.Limit) append("Limit", query.Limit);

	return params.length ? `?${params.join("&")}` : "";
}

export const partyQueries = {
	getParties: (query?: PartyQuery) =>
		queryOptions({
			queryKey: ["parties", query],
			queryFn: async () => {
				const result = await apiFetch<components["schemas"]["PartyItems"][]>(
					`/parties${toQueryString(query)}`,
				);
				if (!result.ok) throw new Error("Unable to load parties");
				return result.data;
			},
		}),
	getParty: (id: number | string) =>
		queryOptions({
			queryKey: ["parties", "detail", String(id)],
			queryFn: async () => {
				const result = await apiFetch<components["schemas"]["PartyDetails"]>(
					`/parties/${id}`,
				);
				if (!result.ok) throw new Error("Unable to load party");
				return result.data;
			},
		}),
};
