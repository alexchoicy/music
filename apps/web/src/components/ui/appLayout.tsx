import type React from "react";
import { AppHeader } from "./appHeader";

type AppLayoutProps = {
	header?: React.ReactNode;
	children: React.ReactNode;
};

export function AppLayout({ header, children }: AppLayoutProps) {
	return (
		<div className="grid min-h-0 min-w-0 w-full grid-rows-[auto_1fr]">
			<AppHeader>{header}</AppHeader>
			<main className="min-h-0 min-w-0">{children}</main>
		</div>
	);
}
