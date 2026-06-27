import { queryOptions } from "@tanstack/react-query";

import type { components } from "#/data/APIschema";

import { $APIFetch } from "../APIFetchClient";

const ROLE_ORDER: Record<string, number> = {
	Owner: 0,
	Admin: 1,
	Uploader: 2,
	User: 3,
};

const rolePriority = (roles: string[]) =>
	Math.min(...roles.map((r) => ROLE_ORDER[r] ?? 99));

export const userQuery = {
	getUsers: () =>
		queryOptions({
			queryKey: ["users"],
			queryFn: async () => {
				const result =
					await $APIFetch<components["schemas"]["UserInfo"][]>("/users");
				if (!result.ok) throw new Error("Failed to fetch users");
				return result.data.toSorted(
					(a, b) => rolePriority(a.roles) - rolePriority(b.roles),
				);
			},
		}),
};

export const userMutation = {
	addUser: () => ({
		mutationFn: async (info: components["schemas"]["CreateUserRequest"]) => {
			const result = await $APIFetch<components["schemas"]["UserInfo"]>(
				"/users",
				{
					method: "POST",
					body: JSON.stringify(info),
				},
			);
			if (!result.ok) throw new Error("Failed to add user");
			return result.data;
		},
	}),
	editUser: () => ({
		mutationFn: async ({
			id,
			...info
		}: components["schemas"]["UpdateUserRequest"] & { id: string }) => {
			const result = await $APIFetch<components["schemas"]["UserInfo"]>(
				`/users/${id}`,
				{
					method: "PATCH",
					body: JSON.stringify(info),
				},
			);
			if (!result.ok) throw new Error("Failed to update user");
			return result.data;
		},
	}),
};
