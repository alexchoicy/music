import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";
import { $APIFetch } from "#/lib/APIFetchClient";

export type ListeningHistoryPage =
	components["schemas"]["ListeningHistoryPage"];
export type ListeningHistoryEntry = ListeningHistoryPage["entries"][number];
export type ListeningHistoryCounts =
	components["schemas"]["ListeningHistoryCounts"];

export const historyQueries = {
	list: (userId: string) =>
		infiniteQueryOptions({
			queryKey: ["history", userId, "list"],
			initialPageParam: null as ListeningHistoryPage["nextCursor"],
			queryFn: async ({ pageParam, signal }) => {
				const result = await $APIFetch<ListeningHistoryPage>(
					pageParam === null ? "/history" : `/history?before=${pageParam}`,
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
			getNextPageParam: (page) => page.nextCursor ?? undefined,
		}),
	counts: (userId: string) =>
		queryOptions({
			queryKey: ["history", userId, "counts"],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<ListeningHistoryCounts>(
					"/history/counts",
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};

async function writeHistory(endpoint: string, method: string, body?: unknown) {
	const result = await $APIFetch<void>(endpoint, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!result.ok) throw result.error;
}

export const historyActions = {
	record: (request: components["schemas"]["RecordListeningHistoryRequest"]) =>
		writeHistory("/history", "POST", request),
	remove: (entryId: ListeningHistoryEntry["entryId"]) =>
		writeHistory(`/history/${entryId}`, "DELETE"),
};
