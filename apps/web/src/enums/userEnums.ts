import type * as API from "@music/api";

import { enumOptions } from "./utils";

type Roles = API.Roles;

export const ROLE: Record<Roles, string> = {
	Admin: "Admin",
	Uploader: "Uploader",
	User: "User",
	Owner: "Owner",
} as const;

export const ROLE_OPTIONS = enumOptions(ROLE);

export type RoleBadgeVariant = "default" | "destructive" | "info" | "secondary";

export const ROLE_BADGE_VARIANT: Record<Roles, RoleBadgeVariant> = {
	Admin: "destructive",
	Owner: "default",
	Uploader: "info",
	User: "secondary",
};
