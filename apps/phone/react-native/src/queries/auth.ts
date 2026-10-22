import { queryOptions } from "@tanstack/react-query";
import Constants from "expo-constants";

import { api } from "@/lib/api";
import type { LoginRequest, LoginResult, UserInfo } from "@/lib/schema";

export const authQueries = {
	me: () =>
		queryOptions({
			queryKey: ["auth", "me"],
			queryFn: ({ signal }) => api<UserInfo>("/me", { signal }),
			staleTime: 60 * 1000,
			retry: false,
		}),
};

export function login(
	credentials: Pick<LoginRequest, "username" | "password">,
) {
	const body: LoginRequest = {
		...credentials,
		client: "App",
		deviceName: Constants.deviceName,
	};
	return api<LoginResult>("/auth/login", { method: "POST", body });
}

/** Revokes this phone's session on the server. */
export function logout() {
	return api<null>("/auth/logout", { method: "POST" });
}
