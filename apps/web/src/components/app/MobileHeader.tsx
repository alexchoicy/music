import { Link } from "@tanstack/react-router";
import { MenuIcon, SearchIcon } from "lucide-react";

import { AppMark } from "#/components/app/AppMark";
import { Button } from "#/components/base/button";
import { useSidebar } from "#/components/base/sidebar";

export function MobileHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
	const { toggleSidebar } = useSidebar();

	return (
		<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-background px-3 md:hidden">
			<Button
				aria-label="Open menu"
				onClick={toggleSidebar}
				size="icon-lg"
				variant="ghost"
			>
				<MenuIcon aria-hidden="true" />
			</Button>

			<Link
				className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
				to="/"
			>
				<AppMark className="size-7" />
				<span className="text-base font-semibold">Music</span>
			</Link>

			<Button
				aria-label="Search"
				onClick={onOpenSearch}
				size="icon-lg"
				variant="ghost"
			>
				<SearchIcon aria-hidden="true" />
			</Button>
		</header>
	);
}
