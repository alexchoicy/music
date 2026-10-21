import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type ConcertQuery = API.GetConcertsData["query"];

export const concertQueries = {
	getConcerts: (query?: ConcertQuery) =>
		queryOptions({
			queryKey: ["concerts", "list", query],
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams();

				if (query?.Search) params.append("Search", query.Search);
				if (query?.PartyIds)
					query.PartyIds.map((item) => params.append("PartyIds", String(item)));
				if (query?.IsIncludeInGuestCredit)
					params.append("IsIncludeInGuestCredit", "true");
				if (query?.Sort) params.set("Sort", query.Sort);
				if (query?.Limit) params.set("Limit", String(query.Limit));

				const url = params.size
					? `/concerts?${params.toString()}`
					: "/concerts";

				const result = await $APIFetch<API.ConcertListItem[]>(url, { signal });
				if (!result.ok)
					throw new ApiError("Unable to load concerts", result.status);
				return result.data;
			},
		}),
	getConcert: (id: number | string) =>
		queryOptions({
			queryKey: ["concerts", String(id)],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<API.ConcertDetails>(`/concerts/${id}`, {
					method: "GET",
					signal,
				});

				if (!result.ok) {
					throw new ApiError("Unable to load concert", result.status);
				}

				return result.data;
			},
		}),
};
