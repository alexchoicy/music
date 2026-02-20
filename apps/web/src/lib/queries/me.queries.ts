import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const meQueries = {
	getMe: () =>
		queryOptions({
			queryKey: ["me"],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["UserDto"]>(
					"/me",
					{
						method: "GET",
					},
				);
				if (!result.ok) {
					throw new Error("Failed to fetch current user");
				}
				return result.data;
			},
			retry: 0,
			staleTime: 1000 * 60 * 5,
		}),
};
