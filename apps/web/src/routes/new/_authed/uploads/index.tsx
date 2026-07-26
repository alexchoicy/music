import { createFileRoute } from "@tanstack/react-router";

import { UploadsPage } from "#/routes/_authed/uploads/index";

export const Route = createFileRoute("/new/_authed/uploads/")({
	component: () => <UploadsPage newStyle />,
});
