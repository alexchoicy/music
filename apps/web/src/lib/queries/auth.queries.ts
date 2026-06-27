import { queryOptions } from "@tanstack/react-query";

import type { components } from "@/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

export const authMutations = {
	login: () => ({
		mutationFn: async (data: components["schemas"]["LoginRequest"]) => {
			const result = await $APIFetch<components["schemas"]["LoginResult"]>(
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
	logout: () => ({
		mutationFn: async () => {
			await $APIFetch("/auth/logout", { method: "POST" });
		},
	}),
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
	userInfo: () =>
		queryOptions({
			queryKey: ["auth", "me"],
			queryFn: async () => {
				const result = await $APIFetch<components["schemas"]["UserInfo"]>(
					"/me",
					{
						method: "GET",
					},
				);

				if (!result.ok) {
					throw new Error("Unable to load user info");
				}

				return result.data;
			},
			staleTime: 60 * 1000,
			retry: false,
		}),
	sessions: () =>
		queryOptions({
			queryKey: ["auth", "sessions"],
			queryFn: async () => {
				const result = await $APIFetch<
					components["schemas"]["AuthSessionDto"][]
				>("/auth/sessions", { method: "GET" });

				if (!result.ok) {
					throw new Error("Unable to load token sessions");
				}

				return result.data;
			},
			staleTime: 60 * 1000,
			retry: false,
		}),
};
