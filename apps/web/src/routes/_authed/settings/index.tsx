import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, Users } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { UsersManagementSettings } from "@/components/settings/usersManagementSettings";
import { WebAuthenticationSettings } from "@/components/settings/webAuthenticationSettings";
import { AppLayout } from "@/components/ui/appLayout";
import { meQueries } from "@/lib/queries/me.queries";

type SettingsTab = "web-authentication" | "users-management";

type SettingsTabItem = {
	value: SettingsTab;
	label: string;
	display: boolean;
	icon: typeof Fingerprint;
};

export const Route = createFileRoute("/_authed/settings/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(meQueries.getMe());
	},
});

function RouteComponent() {
	return (
		<AppLayout>
			<Suspense fallback={<div className="p-6">Loading...</div>}>
				<SettingsContent />
			</Suspense>
		</AppLayout>
	);
}

function SettingsContent() {
	const { data: me } = useSuspenseQuery(meQueries.getMe());
	const canManageUsers = me.roles.some(
		(role) => role.toLowerCase() === "admin",
	);
	const [activeTab, setActiveTab] = useState<SettingsTab>("web-authentication");
	const leftTabs: SettingsTabItem[] = [
		{
			value: "web-authentication",
			label: "Web Authentication",
			display: true,
			icon: Fingerprint,
		},
		{
			value: "users-management",
			label: "Users Management",
			display: canManageUsers,
			icon: Users,
		},
	];
	const visibleTabs = leftTabs.filter((tab) => tab.display);

	useEffect(() => {
		const activeTabVisible = visibleTabs.some((tab) => tab.value === activeTab);
		if (!activeTabVisible && visibleTabs[0]) {
			setActiveTab(visibleTabs[0].value);
		}
	}, [activeTab, visibleTabs]);

	return (
		<div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[240px_1fr]">
			<div className="border-b border-border p-3 md:border-b-0 md:border-r">
				<div
					className="flex flex-row gap-2 md:flex-col"
					role="tablist"
					aria-label="Settings tabs"
				>
					{visibleTabs.map((tab) => {
						const Icon = tab.icon;
						return (
							<button
								key={tab.value}
								type="button"
								role="tab"
								aria-selected={activeTab === tab.value}
								onClick={() => setActiveTab(tab.value)}
								className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
									activeTab === tab.value
										? "bg-secondary text-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
								}`}
							>
								<Icon className="size-4" />
								<span>{tab.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="min-h-0 overflow-y-auto p-6">
				{activeTab === "web-authentication" && <WebAuthenticationSettings />}
				{activeTab === "users-management" && canManageUsers && (
					<UsersManagementSettings />
				)}
			</div>
		</div>
	);
}
