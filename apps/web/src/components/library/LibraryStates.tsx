import type { ReactNode } from "react";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/base/empty";
import { Skeleton } from "#/components/base/skeleton";
import { cn } from "#/lib/utils/styles";

export function LibraryEmptyState({
	description,
	icon,
	title,
}: {
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia>
					<span className="text-muted-foreground [&_svg]:size-8">{icon}</span>
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

export function TileGridSkeleton({
	gridClassName,
	shape,
}: {
	gridClassName: string;
	shape: "square" | "round" | "wide";
}) {
	return (
		<div aria-hidden="true" className={gridClassName}>
			{Array.from({ length: 12 }, (_, index) => (
				<div
					className={cn(
						"flex min-w-0 flex-col gap-3",
						shape === "round" && "items-center",
					)}
					key={index}
				>
					<Skeleton
						className={cn(
							shape === "square" && "aspect-square w-full",
							shape === "wide" && "aspect-video w-full",
							shape === "round" && "size-28",
						)}
						shape={shape === "round" ? "circle" : "tile"}
					/>
					<div
						className={cn(
							"flex w-full flex-col gap-1.5",
							shape === "round" && "items-center",
						)}
					>
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				</div>
			))}
		</div>
	);
}
