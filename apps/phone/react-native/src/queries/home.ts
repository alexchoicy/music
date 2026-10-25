import { queryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { HomeFeed, LibraryStats } from "@/lib/schema";

export const homeQueries = {
	feed: () =>
		queryOptions({
			queryKey: ["home", "feed"],
			queryFn: ({ signal }) => api<HomeFeed>("/home", { signal }),
		}),
	stats: () =>
		queryOptions({
			queryKey: ["home", "stats"],
			queryFn: ({ signal }) => api<LibraryStats>("/stats", { signal }),
		}),
};
