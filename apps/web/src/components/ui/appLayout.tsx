import type React from "react";
import { AppHeader } from "./appHeader";

type AppLayoutProps = {
	header?: React.ReactNode;
	footer?: React.ReactNode;
	children: React.ReactNode;
};

export function AppLayout({ header, footer, children }: AppLayoutProps) {
	return (
		<div className="flex flex-col min-h-full w-full">
			<AppHeader>{header}</AppHeader>
			<main className="flex-1 p-6">{children}</main>
			{/* This is smart */}
			{footer && <div className="mt-auto">{footer}</div>}
		</div>
	);
}
