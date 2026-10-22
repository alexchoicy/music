import { queryOptions } from "@tanstack/react-query";

import type { paths } from "@/data/APIschema";
import { api } from "@/lib/api";
import type { PartyDetails, PartyListItem } from "@/lib/schema";

export type PartyQuery = NonNullable<
	paths["/parties"]["get"]["parameters"]["query"]
>;

export const partyQueries = {
	list: (query: PartyQuery) =>
		queryOptions({
			queryKey: ["parties", "list", query],
			queryFn: ({ signal }) =>
				api<PartyListItem[]>("/parties", { query, signal }),
		}),
	detail: (id: number | string) =>
		queryOptions({
			queryKey: ["parties", "detail", String(id)],
			queryFn: ({ signal }) => api<PartyDetails>(`/parties/${id}`, { signal }),
		}),
};
