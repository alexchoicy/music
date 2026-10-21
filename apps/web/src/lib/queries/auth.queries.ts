import type * as API from "@music/api";
import { queryOptions } from "@tanstack/react-query";

import { getDefaultDeviceName } from "#/store/playbackDeviceStore";

import { $APIFetch, ApiError } from "../APIFetchClient";

export type AuthSession = API.AuthSessionDto;
export type ApiKey = API.ApiKeyDto;
export type CreatedApiKey = API.CreatedApiKey;

/** The server rejected the session (401), as opposed to being unreachable or failing. */
export class UnauthorizedError extends ApiError {
	constructor() {
		super("Not signed in", 401);
	}
}

async function deleteOrThrow(endpoint: string, failure: string) {
	const result = await $APIFetch(endpoint, { method: "DELETE" });
	if (!result.ok) throw new Error(failure);
}

export const authMutations = {
	login: () => ({
		mutationFn: async (
			data: Pick<API.LoginRequest, "username" | "password">,
		) => {
			// Web sessions live in the HttpOnly cookie; the response carries no token.
			const body: API.LoginRequest = {
				...data,
				client: "Web",
				deviceName: getDefaultDeviceName(),
			};
			const result = await $APIFetch<API.LoginResult>("/auth/login", {
				method: "POST",
				body: JSON.stringify(body),
			});
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
	revokeSession: () => ({
		mutationFn: (id: AuthSession["id"]) =>
			deleteOrThrow(`/auth/sessions/${id}`, "Could not sign out the session"),
	}),
	createApiKey: () => ({
		mutationFn: async (name: string) => {
			const result = await $APIFetch<CreatedApiKey>("/auth/api-keys", {
				method: "POST",
				body: JSON.stringify({ name }),
			});
			if (!result.ok) throw new Error("Could not create the API key");
			return result.data;
		},
	}),
	revokeApiKey: () => ({
		mutationFn: (id: ApiKey["id"]) =>
			deleteOrThrow(`/auth/api-keys/${id}`, "Could not revoke the API key"),
	}),
};

export const authQueries = {
	userInfo: () =>
		queryOptions({
			queryKey: ["auth", "me"],
			queryFn: async () => {
				const result = await $APIFetch<API.UserInfo>("/me", {
					method: "GET",
				});

				if (!result.ok) {
					throw result.status === 401
						? new UnauthorizedError()
						: new ApiError("Unable to load user info", result.status);
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
				const result = await $APIFetch<AuthSession[]>("/auth/sessions", {
					method: "GET",
				});

				if (!result.ok) {
					throw new ApiError("Unable to load sessions", result.status);
				}

				return result.data;
			},
			staleTime: 60 * 1000,
			retry: false,
		}),
	apiKeys: () =>
		queryOptions({
			queryKey: ["auth", "api-keys"],
			queryFn: async () => {
				const result = await $APIFetch<ApiKey[]>("/auth/api-keys");
				if (!result.ok)
					throw new ApiError("Unable to load API keys", result.status);
				return result.data;
			},
			staleTime: 60 * 1000,
			retry: false,
		}),
};
