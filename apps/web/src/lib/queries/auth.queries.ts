import { queryOptions } from "@tanstack/react-query";
import type { components } from "@/data/APIschema";
import { $APIFetch } from "../APIFetchClient";

export const authMutations = {
	login: {
		mutationFn: async (data: components["schemas"]["LoginRequest"]) => {
			const result = await $APIFetch<components["schemas"]["LoginResponse"]>(
				"/auth/login",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			);
			if (!result.ok) {
				throw new Error("Invalid username or password");
			}
			return result.data;
		},
	},
};

export const authQueries = {
	checkAuth: () =>
		queryOptions({
			queryKey: ["auth", "check"],
			queryFn: async () => {
				const result = await $APIFetch("/auth", {
					method: "GET",
				});
				return result.ok;
			},
			staleTime: 1000,
			retry: false,
		}),
};
