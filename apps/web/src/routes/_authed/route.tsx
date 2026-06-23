import { useHotkey } from "@tanstack/react-hotkeys";
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ScrollArea } from "#/components/coss/scroll-area";
import { SidebarInset, SidebarProvider } from "#/components/coss/sidebar";
import { AppSidebar } from "#/components/ui/appSidebar";
import { AudioPlayer } from "#/components/ui/audioPlayer";
import { Command } from "#/components/ui/command";
import { MobileHeader } from "#/components/ui/mobileHeader";
import { UserInfoProvider } from "#/context/UserInfoContext";
import { authQueries } from "#/lib/queries/auth.queries";
import { useUploadStore } from "#/store/uploadStore";

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context, location }) => {
		const isAuthenticated = await context.queryClient.fetchQuery(
			authQueries.checkAuth(),
		);

		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		await context.queryClient.ensureQueryData(authQueries.userInfo());
	},
	component: RouteComponent,
});

function RouteComponent() {
	const [openCommand, setOpenCommand] = useState(false);
	const isUploading = useUploadStore((state) => state.isRunning);
	const navigator = useNavigate();
	useHotkey("Control+K", () => {
		setOpenCommand((open) => !open);
	});

	useHotkey("1", () => {
		navigator({ to: "/" });
	});
	useHotkey("2", () => {
		navigator({ to: "/albums" });
	});
	useHotkey("3", () => {
		navigator({ to: "/parties" });
	});
	useHotkey("4", () => {
		navigator({ to: "/concerts" });
	});

	useEffect(() => {
		if (!isUploading) return;

		const blockUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};

		window.addEventListener("beforeunload", blockUnload);
		return () => window.removeEventListener("beforeunload", blockUnload);
	}, [isUploading]);

	return (
		<UserInfoProvider>
			<SidebarProvider>
				<AppSidebar onOpenCommand={() => setOpenCommand(true)} />
				<SidebarInset className="h-svh overflow-hidden">
					<MobileHeader onOpenCommand={() => setOpenCommand(true)} />
					<div className="relative flex min-h-0 flex-1 flex-col">
						<ScrollArea className="min-h-0 flex-1">
							<Outlet />
						</ScrollArea>
						<AudioPlayer />
					</div>
				</SidebarInset>
				<Command onOpenChange={setOpenCommand} open={openCommand} />
			</SidebarProvider>
		</UserInfoProvider>
	);
}
