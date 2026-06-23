import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, use } from "react";
import type { ReactNode } from "react";

import type { components } from "#/data/APIschema";
import { authQueries } from "#/lib/queries/auth.queries";

export type UserInfo = components["schemas"]["UserInfo"];

const UserInfoContext = createContext<UserInfo | null>(null);

export function UserInfoProvider({
	children,
}: {
	children: ReactNode;
}): React.ReactElement {
	const { data: userInfo } = useSuspenseQuery(authQueries.userInfo());

	return (
		<UserInfoContext.Provider value={userInfo}>
			{children}
		</UserInfoContext.Provider>
	);
}

export function useUserInfo(): UserInfo {
	const userInfo = use(UserInfoContext);

	if (!userInfo) {
		throw new Error("useUserInfo must be used within a UserInfoProvider.");
	}

	return userInfo;
}
