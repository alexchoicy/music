import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { CircleAlertIcon, SearchXIcon } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { Button } from "#/components/base/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/base/empty";
import { Spinner } from "#/components/base/spinner";

function RouteState({
	action,
	description,
	icon,
	title,
}: {
	action: ReactNode;
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<Empty className="min-h-full">
			<EmptyHeader>
				<EmptyMedia>
					<span className="text-muted-foreground [&_svg]:size-8">{icon}</span>
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>{action}</EmptyContent>
		</Empty>
	);
}

export function RouteNotFound() {
	return (
		<RouteState
			action={<Button render={<Link to="/" />}>Go home</Button>}
			description="This page doesn't exist or has been removed."
			icon={<SearchXIcon aria-hidden="true" />}
			title="Not found"
		/>
	);
}

export function RouteError({ error }: ErrorComponentProps) {
	const router = useRouter();
	const queryErrorResetBoundary = useQueryErrorResetBoundary();

	// Let suspense queries that failed fetch again when the route re-renders.
	useEffect(() => {
		queryErrorResetBoundary.reset();
	}, [queryErrorResetBoundary]);

	return (
		<RouteState
			action={
				<Button onClick={() => void router.invalidate()} variant="outline">
					Try again
				</Button>
			}
			description={
				error instanceof Error && error.message
					? error.message
					: "Something went wrong loading this page."
			}
			icon={<CircleAlertIcon aria-hidden="true" />}
			title="Unable to load this page"
		/>
	);
}

export function RoutePending() {
	return (
		<div className="flex min-h-[60svh] flex-1 items-center justify-center p-6 text-muted-foreground">
			<Spinner className="size-6" />
		</div>
	);
}
