import { SidebarTrigger } from "../shadcn/sidebar";

export function AppHeader({ children }: { children?: React.ReactNode }) {
	return (
		<div className="sticky top-0 z-50 bg-background border-b">
			<header className="grid grid-cols-3 h-16 shrink-0 items-center gap-2 px-4">
				<div className="flex items-center gap-2">
					<SidebarTrigger className="-ml-1" />
					<h1 className="text-lg font-bold">Music</h1>
				</div>
				{children}
			</header>
		</div>
	);
}
