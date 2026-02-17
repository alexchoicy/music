import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const meQueries = {
	getMe: () =>
		queryOptions({
			queryKey: ["me"],
			queryFn: async () => {
				const response = await $APIFetch<components["schemas"]["UserDto"]>(
					"/me",
					{
						method: "GET",
					},
				);
				return response;
			},
			retry: 0,
			staleTime: 1000 * 60 * 5,
		}),
};
