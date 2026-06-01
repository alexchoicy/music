import { MenuIcon, Search } from "lucide-react"

import { Button } from "#/components/coss/button"
import { useSidebar } from "#/components/coss/sidebar"

export function MobileHeader(): React.ReactElement {
	const { toggleSidebar } = useSidebar()

	return (
		<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
			<Button
				aria-label="Open menu"
				onClick={toggleSidebar}
				size="icon"
				variant="ghost"
			>
				<MenuIcon className="size-5" />
			</Button>

			<div className="flex items-center gap-2">
				<img alt="" className="size-7 rounded-md" src="/logo192.png" />
				<span className="text-sm font-semibold">Music</span>
			</div>

			<Button aria-label="Search" size="icon" variant="ghost">
				<Search className="size-5" />
			</Button>
		</header>
	)
}
