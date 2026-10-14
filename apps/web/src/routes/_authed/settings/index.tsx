import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PageHeader } from "#/components/app/PageHeader";
import { Tabs, TabsList, TabsPanel, TabsTab } from "#/components/base/tabs";
import { ApiKeysSettings } from "#/components/settings/ApiKeysSettings";
import { SecuritySettings } from "#/components/settings/SecuritySettings";
import { UsersSettings } from "#/components/settings/UsersSettings";
import { useUserInfo } from "#/context/UserInfoContext";

const settingsSearchSchema = z.object({
	tab: z.enum(["api-keys", "users"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authed/settings/")({
	validateSearch: settingsSearchSchema,
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { tab: requestedTab } = Route.useSearch();
	const userInfo = useUserInfo();
	const isAdmin =
		userInfo.roles.includes("Admin") || userInfo.roles.includes("Owner");
	const tab = isAdmin ? (requestedTab ?? "security") : "security";

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-7 p-4 sm:p-6">
			<PageHeader eyebrow="Account" title="Settings" />

			<Tabs
				onValueChange={(value) =>
					navigate({
						replace: true,
						search: {
							tab:
								value === "api-keys" || value === "users" ? value : undefined,
						},
					})
				}
				value={tab}
			>
				<TabsList aria-label="Settings" className="mb-6" variant="underline">
					<TabsTab value="security">Security</TabsTab>
					{isAdmin && <TabsTab value="api-keys">API keys</TabsTab>}
					{isAdmin && <TabsTab value="users">Users</TabsTab>}
				</TabsList>

				<TabsPanel value="security">
					<SecuritySettings />
				</TabsPanel>
				{isAdmin && (
					<TabsPanel value="api-keys">
						<ApiKeysSettings />
					</TabsPanel>
				)}
				{isAdmin && (
					<TabsPanel value="users">
						<UsersSettings />
					</TabsPanel>
				)}
			</Tabs>
		</main>
	);
}
