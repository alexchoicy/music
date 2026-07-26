import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "#/routes/_authed/settings/index";

export const Route = createFileRoute("/new/_authed/settings/")({
	component: () => <SettingsPage newStyle />,
});
