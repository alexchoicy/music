import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";
import { $APIFetch } from "#/lib/APIFetchClient";

export type InboxGroupListItem = components["schemas"]["InboxGroupListItem"];
export type InboxGroupDetails = components["schemas"]["InboxGroupDetails"];
export type InboxItemDetails = components["schemas"]["InboxItemDetails"];
export type InboxItemRequest = components["schemas"]["InboxItemRequest"];
type CreateAlbumRequest = components["schemas"]["CreateAlbumRequest"];
type CreateAlbumResult = components["schemas"]["CreateAlbumResult"];

export const inboxQueries = {
	groups: (includeResolved: boolean) =>
		queryOptions({
			queryKey: ["inbox", "groups", { includeResolved }],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<InboxGroupListItem[]>(
					`/inbox/groups?includeResolved=${includeResolved}`,
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
	group: (id: string) =>
		queryOptions({
			queryKey: ["inbox", "group", id],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<InboxGroupDetails>(
					`/inbox/groups/${id}`,
					{ signal },
				);
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};

async function writeInboxItems(endpoint: string, itemIds: string[]) {
	const result = await $APIFetch<void>(endpoint, {
		method: "POST",
		body: JSON.stringify({ itemIds }),
	});
	if (!result.ok) throw result.error;
}

export const inboxActions = {
	createGroup: async (
		request: components["schemas"]["CreateInboxGroupRequest"],
	) => {
		const result = await $APIFetch<
			components["schemas"]["CreateInboxGroupResult"]
		>("/inbox", {
			method: "POST",
			body: JSON.stringify(request),
		});
		if (!result.ok) throw result.error;
		return result.data;
	},
	discard: (itemIds: string[]) =>
		writeInboxItems("/inbox/items/discard", itemIds),
	restore: (itemIds: string[]) =>
		writeInboxItems("/inbox/items/restore", itemIds),
	createAlbums: async (request: CreateAlbumRequest[]) => {
		const result = await $APIFetch<CreateAlbumResult[]>("/inbox/albums", {
			method: "POST",
			body: JSON.stringify(request),
		});

		if (result.ok) return result.data;

		if (Array.isArray(result.error.cause))
			return result.error.cause as CreateAlbumResult[];

		throw result.error;
	},
};
