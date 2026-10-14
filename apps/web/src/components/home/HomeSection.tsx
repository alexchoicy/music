import { Link } from "@tanstack/react-router";
import { useId } from "react";
import type { ReactNode } from "react";

import { cn } from "#/lib/utils/styles";

type HomeSectionProps = {
	children: ReactNode;
	title: string;
	viewAll?: "/albums" | "/concerts" | "/parties" | "/history";
};

export function HomeSection({ children, title, viewAll }: HomeSectionProps) {
	const headingId = useId();

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-4">
			<div className="flex items-end justify-between gap-4">
				<h2 className="text-xl font-semibold tracking-tight" id={headingId}>
					{title}
				</h2>
				{viewAll && (
					<Link
						className="rounded-xs text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						search={viewAll === "/history" ? {} : { sort: "CreatedAtDesc" }}
						to={viewAll}
					>
						View all
					</Link>
				)}
			</div>
			{children}
		</section>
	);
}

// A single row of tiles: items past the columns that fit are removed, not clipped.
// Breakpoints follow (min tile + 16px gap) × n − 16px for each column count.
const ROW_ITEM_CLASS = {
	square: [
		"",
		"@max-[316px]:hidden",
		"@max-[482px]:hidden",
		"@max-[648px]:hidden",
		"@max-[814px]:hidden",
		"@max-[980px]:hidden",
		"@max-[1146px]:hidden",
		"@max-[1312px]:hidden",
		"@max-[1478px]:hidden",
		"@max-[1644px]:hidden",
	],
	wide: [
		"",
		"@max-[496px]:hidden",
		"@max-[752px]:hidden",
		"@max-[1008px]:hidden",
		"@max-[1264px]:hidden",
		"@max-[1520px]:hidden",
		"@max-[1776px]:hidden",
		"@max-[2032px]:hidden",
		"@max-[2288px]:hidden",
		"@max-[2544px]:hidden",
	],
};

type TileRowProps<T> = {
	items: T[];
	size?: keyof typeof ROW_ITEM_CLASS;
	children: (item: T, className: string) => ReactNode;
};

export function TileRow<T>({
	items,
	size = "square",
	children,
}: TileRowProps<T>) {
	const itemClasses = ROW_ITEM_CLASS[size];

	return (
		<div className="@container">
			<div
				className={cn(
					"grid gap-4",
					size === "square"
						? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
						: "grid-cols-[repeat(auto-fill,minmax(240px,1fr))]",
				)}
			>
				{items
					.slice(0, itemClasses.length)
					.map((item, index) => children(item, itemClasses[index]))}
			</div>
		</div>
	);
}
