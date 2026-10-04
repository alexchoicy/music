import type { components } from "@api/schema";
import { queryOptions } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export const authMutations = {
	login: () => ({
		mutationFn: async (data: components["schemas"]["LoginRequest"]) => {
			const result = await apiFetch<components["schemas"]["LoginResult"]>(
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
	}),
};

export const authQueries = {
	userInfo: () =>
		queryOptions({
			queryKey: ["auth", "me"],
			queryFn: async () => {
				const result = await apiFetch<components["schemas"]["UserInfo"]>("/me");

				if (!result.ok) {
					throw new Error("Unable to load user info");
				}

				return result.data;
			},
			staleTime: 60 * 1000,
			retry: false,
		}),
};
