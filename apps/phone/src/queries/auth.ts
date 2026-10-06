import { queryOptions } from "@tanstack/react-query";

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

export function login(request: LoginRequest) {
	return api<LoginResult>("/auth/login", { method: "POST", body: request });
}
