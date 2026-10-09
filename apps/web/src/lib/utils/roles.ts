import type { UserInfo } from "#/context/UserInfoContext";

const EDITOR_ROLES = new Set(["Uploader", "Admin", "Owner"]);

export function canEditContent(userInfo: UserInfo) {
	return userInfo.roles.some((role) => EDITOR_ROLES.has(role));
}
