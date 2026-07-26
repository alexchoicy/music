import { createFileRoute } from "@tanstack/react-router";
import { KeyRoundIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/components/coss/tabs";
import { NewPage, NewPageHeader } from "#/components/new/NewPage";
import { AuthTabContent } from "#/components/settings/authTabContent";
import { UsersTabContent } from "#/components/settings/usersTabContent";
import { useUserInfo } from "#/context/UserInfoContext";

export const Route = createFileRoute("/_authed/settings/")({
	component: SettingsPage,
});

export function SettingsPage({ newStyle = false }: { newStyle?: boolean }) {
	const userInfo = useUserInfo();
	const isAdmin =
		userInfo.roles.includes("Admin") || userInfo.roles.includes("Owner");
	const [value, setValue] = useState("auth");

	const content = (
		<>
			{!newStyle ? (
				<header className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">Account</p>
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Settings
					</h1>
				</header>
			) : null}

			<Tabs value={value} onValueChange={setValue}>
				<TabsList>
					<TabsTrigger value="auth">
						<KeyRoundIcon />
						Account
					</TabsTrigger>
					{isAdmin ? (
						<TabsTrigger value="users">
							<UsersIcon />
							Users management
						</TabsTrigger>
					) : null}
				</TabsList>

				<TabsContent className="min-h-0 flex-1 pt-4 sm:pt-6" value="auth">
					<AuthTabContent />
				</TabsContent>

				{isAdmin ? (
					<TabsContent className="min-h-0 flex-1 pt-4 sm:pt-6" value="users">
						<UsersTabContent />
					</TabsContent>
				) : null}
			</Tabs>
		</>
	);

	if (newStyle)
		return (
			<NewPage>
				<NewPageHeader
					description="Manage sign-in methods, account security, and library access."
					eyebrow="Account"
					title="Settings"
				/>
				{content}
			</NewPage>
		);
	return (
		<main className="flex min-h-full w-full flex-col gap-4 p-4 sm:p-6">
			{content}
		</main>
	);
}
