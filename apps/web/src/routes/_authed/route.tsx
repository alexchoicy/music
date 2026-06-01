import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { SidebarInset, SidebarProvider } from "#/components/coss/sidebar"
import { AppSidebar } from "#/components/ui/appSidebar"
import { AudioPlayer } from "#/components/ui/audioPlayer"
import { MobileHeader } from "#/components/ui/mobileHeader"
import { authQueries } from "#/lib/queries/auth.queries"
import { UserInfoProvider } from "#/Provider/userInfoProvider"

export const Route = createFileRoute("/_authed")({
	beforeLoad: async ({ context, location }) => {
		const isAuthenticated = await context.queryClient.fetchQuery(
			authQueries.checkAuth(),
		)

		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			})
		}

		await context.queryClient.ensureQueryData(authQueries.userInfo())
	},
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<UserInfoProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset>
					<MobileHeader />
					<div className="grid min-h-0 flex-1 grid-rows-[1fr_auto]">
						<div className="min-h-0 overflow-auto">
							<Outlet />
						</div>
						<AudioPlayer />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</UserInfoProvider>
	)
}
