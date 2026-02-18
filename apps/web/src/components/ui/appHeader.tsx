import { SidebarTrigger } from "../shadcn/sidebar";

export function AppHeader({ children }: { children?: React.ReactNode }) {
	return (
		<div className="sticky top-0 z-50 bg-background border-b">
			<header className="flex h-16 shrink-0 items-center gap-2 px-4">
				<div className="flex justify-between w-full">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="-ml-1" />
						<h1 className="text-lg font-bold">Music</h1>
					</div>
					<div className="flex items-center gap-2">{children}</div>
				</div>
			</header>
		</div>
	);
}
