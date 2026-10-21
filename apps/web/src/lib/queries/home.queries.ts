import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { $APIFetch } from "../APIFetchClient";

export type HomeFeed = API.HomeFeed;
export type ContinueListeningItem = HomeFeed["continueListening"][number];

export const homeQueries = {
	getFeed: (userId: string) =>
		queryOptions({
			queryKey: ["home", userId],
			queryFn: async ({ signal }) => {
				const result = await $APIFetch<HomeFeed>("/home", { signal });
				if (!result.ok) throw result.error;
				return result.data;
			},
		}),
};
