import { SlidersHorizontalIcon, RotateCcwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "#/components/coss/button";
import {
	Collapsible,
	CollapsiblePanel,
	CollapsibleTrigger,
} from "#/components/coss/collapsible";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import { Skeleton } from "#/components/coss/skeleton";
import { cn } from "#/lib/utils/styles";

export function NewPage({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<main
			className={cn(
				"mx-auto flex min-h-full w-full max-w-[1560px] min-w-0 flex-col gap-8 px-4 pt-5 pb-28 sm:px-6 sm:pt-7 lg:px-10 lg:pt-10 lg:pb-32",
				className,
			)}
		>
			{children}
		</main>
	);
}

export function NewPageHeader({
	action,
	description,
	eyebrow,
	title,
}: {
	action?: ReactNode;
	description?: string;
	eyebrow: string;
	title: string;
}) {
	return (
		<header className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				<p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
					{eyebrow}
				</p>
				<h1 className="font-heading text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
					{title}
				</h1>
				{description ? (
					<p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
						{description}
					</p>
				) : null}
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</header>
	);
}

export function NewSectionHeader({
	action,
	description,
	title,
}: {
	action?: ReactNode;
	description?: string;
	title: string;
}) {
	return (
		<div className="flex items-end justify-between gap-4">
			<div>
				<h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
					{title}
				</h2>
				{description ? (
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			{action}
		</div>
	);
}

export function NewEmptyState({
	action,
	description,
	icon,
	onRetry,
	title,
}: {
	action?: ReactNode;
	description: string;
	icon: ReactNode;
	onRetry?: () => void;
	title: string;
}) {
	return (
		<Empty className="min-h-80 rounded-[2rem] border border-dashed bg-card/35">
			<EmptyHeader>
				<EmptyMedia variant="icon">{icon}</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{action || onRetry ? (
				<EmptyContent>
					{action}
					{onRetry ? (
						<Button onClick={onRetry} variant="outline">
							<RotateCcwIcon />
							Try again
						</Button>
					) : null}
				</EmptyContent>
			) : null}
		</Empty>
	);
}

export function NewMediaSkeleton({
	kind = "square",
	rows = 8,
}: {
	kind?: "row" | "square";
	rows?: number;
}) {
	if (kind === "row") {
		return (
			<div className="divide-y divide-border/60 border-y border-border/60">
				{Array.from({ length: rows }, (_, index) => (
					<div className="flex items-center gap-4 py-4" key={index}>
						<Skeleton className="size-16 shrink-0 rounded-xl" />
						<div className="grid flex-1 gap-2">
							<Skeleton className="h-4 w-2/5" />
							<Skeleton className="h-3 w-1/4" />
						</div>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
			{Array.from({ length: rows }, (_, index) => (
				<div className="grid gap-3" key={index}>
					<Skeleton className="aspect-square rounded-[1.4rem]" />
					<Skeleton className="h-4 w-4/5" />
					<Skeleton className="h-3 w-3/5" />
				</div>
			))}
		</div>
	);
}

export function NewFilterPanel({ children }: { children: ReactNode }) {
	return (
		<Collapsible defaultOpen={false}>
			<CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border bg-card/50 px-4 py-3 text-sm font-medium sm:hidden">
				<span className="flex items-center gap-2">
					<SlidersHorizontalIcon className="size-4" />
					Filters
				</span>
				<span className="text-xs text-muted-foreground">Show</span>
			</CollapsibleTrigger>
			<CollapsiblePanel className="sm:hidden">
				<div className="mt-3 rounded-2xl border bg-card/35 p-4">{children}</div>
			</CollapsiblePanel>
			<div className="hidden rounded-2xl border border-border/60 bg-card/35 p-4 sm:block">
				{children}
			</div>
		</Collapsible>
	);
}
