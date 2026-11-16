import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type PartyQuery = API.GetPartiesData["query"];

export const partyQueries = {
	getParties: (query?: PartyQuery) =>
		queryOptions({
			queryKey: ["parties", "list", query],
			queryFn: async ({ signal }) => {
				const params = new URLSearchParams();

				if (query?.Search) params.set("Search", query.Search);
				if (query?.Country) params.set("Country", query.Country);
				if (query?.Type) params.set("Type", query.Type);
				if (query?.Kind) params.set("Kind", query.Kind);
				if (query?.Gender) params.set("Gender", query.Gender);
				if (query?.ExcludeNoAlbums) params.set("ExcludeNoAlbums", "true");
				if (query?.Sort) params.set("Sort", query.Sort);
				if (query?.Limit) params.set("Limit", String(query.Limit));

				const url = params.size ? `/parties?${params}` : "/parties";

				const result = await $APIFetch<API.PartyItems[]>(url, { signal });

				if (!result.ok) {
					throw new ApiError("Unable to load parties", result.status);
				}
				return result.data;
			},
		}),
	getParty: (id: number | string) =>
		queryOptions({
			queryKey: ["parties", String(id)],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<API.PartyDetails>(`/parties/${id}`, {
					method: "GET",
					signal,
				});

				if (!result.ok) {
					throw new ApiError("Unable to load party", result.status);
				}

				return result.data;
			},
		}),
};

export const partyMutation = {
	createParty: () => ({
		mutationFn: async (info: API.CreatePartyRequest) => {
			const result = await $APIFetch<API.CreatePartyResult>("/parties", {
				method: "POST",
				body: JSON.stringify(info),
			});
			if (!result.ok) throw new Error("Failed to create party");
			return result.data;
		},
	}),
};

async function patchParty<T>(
	partyId: number | string,
	path: string,
	request: unknown,
) {
	const result = await $APIFetch<T>(`/parties/${partyId}${path}`, {
		method: "PATCH",
		body: JSON.stringify(request),
	});
	if (!result.ok) throw result.error;
	return result.data;
}

export const partyEditActions = {
	updateDetails: (partyId: number | string, request: API.UpdatePartyRequest) =>
		patchParty<API.UpdatePartyResult>(partyId, "", request),
	updateAliases: (
		partyId: number | string,
		request: API.PartyAliasBatchRequest,
	) => patchParty<void>(partyId, "/aliases", request),
	updateExternalInfos: (
		partyId: number | string,
		request: API.PartyExternalInfoBatchRequest,
	) => patchParty<void>(partyId, "/external-infos", request),
	updateImages: (
		partyId: number | string,
		request: API.PartyImageBatchRequest,
	) => patchParty<API.UpdatePartyResult>(partyId, "/images", request),
};

// Party names and avatars are embedded in albums, playlists and history
export function invalidatePartyEdit(queryClient: QueryClient) {
	for (const key of ["parties", "albums", "playlists", "history"]) {
		void queryClient.invalidateQueries({ queryKey: [key] });
	}
	void queryClient.invalidateQueries({ queryKey: ["party-relationships"] });
}
