import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { Alert, AlertAction, AlertDescription } from "#/components/base/alert";
import {
	AlertDialog,
	AlertDialogClose,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "#/components/base/alert-dialog";
import { Button } from "#/components/base/button";
import { Skeleton } from "#/components/base/skeleton";

export function SettingsSection({
	action,
	children,
	description,
	title,
}: {
	action?: ReactNode;
	children: ReactNode;
	description: string;
	title: string;
}) {
	return (
		<section aria-label={title} className="flex min-w-0 flex-col gap-3">
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
				<div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
					<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}

/** A flat list row: icon, title with badges, a muted detail line, and trailing actions. */
export function SettingsRow({
	actions,
	badges,
	details,
	icon,
	title,
}: {
	actions?: ReactNode;
	badges?: ReactNode;
	details?: ReactNode;
	icon: ReactNode;
	title: string;
}) {
	return (
		<li className="flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60">
			<span
				aria-hidden="true"
				className="shrink-0 text-muted-foreground [&_svg]:size-5"
			>
				{icon}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
					<span className="min-w-0 truncate text-sm font-medium" title={title}>
						{title}
					</span>
					{badges}
				</div>
				{details && (
					<p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
						{details}
					</p>
				)}
			</div>
			{actions && (
				<div className="flex shrink-0 items-center gap-1">{actions}</div>
			)}
		</li>
	);
}

export function SettingsList({ children }: { children: ReactNode }) {
	return <ul className="-mx-3 flex flex-col">{children}</ul>;
}

export function SettingsListSkeleton({ rows = 2 }: { rows?: number }) {
	return (
		<div aria-hidden="true" className="flex flex-col">
			{Array.from({ length: rows }, (_, index) => (
				<div className="flex min-h-14 items-center gap-3 py-2" key={index}>
					<Skeleton className="size-5 shrink-0" />
					<div className="flex flex-1 flex-col gap-1.5">
						<Skeleton className="h-4 w-40 max-w-full" />
						<Skeleton className="h-3 w-64 max-w-full" />
					</div>
				</div>
			))}
		</div>
	);
}

export function SettingsEmpty({
	description,
	icon,
	title,
}: {
	description: string;
	icon: ReactNode;
	title: string;
}) {
	return (
		<div className="flex items-start gap-3 py-3">
			<span
				aria-hidden="true"
				className="shrink-0 text-muted-foreground [&_svg]:size-5"
			>
				{icon}
			</span>
			<div className="flex flex-col gap-0.5">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
}

export function SettingsError({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<Alert variant="error">
			<AlertDescription>{message}</AlertDescription>
			<AlertAction>
				<Button onClick={onRetry} size="xs" type="button" variant="outline">
					Try again
				</Button>
			</AlertAction>
		</Alert>
	);
}

/**
 * Tracks what a dialog acts on. Closing keeps the subject until the close animation ends,
 * so the dialog stays mounted and its text stays stable. `finalFocus` returns focus to the
 * control that opened it, since these dialogs have no registered trigger.
 */
export function useDialogSubject<T>() {
	const [subject, setSubject] = useState<T | null>(null);
	const [open, setOpen] = useState(false);
	const finalFocus = useRef<HTMLElement | null>(null);
	return {
		subject,
		open,
		finalFocus,
		show: (next: T) => {
			finalFocus.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
			setSubject(next);
			setOpen(true);
		},
		close: () => setOpen(false),
		onOpenChangeComplete: (nextOpen: boolean) => {
			if (!nextOpen) setSubject(null);
		},
	};
}

/** The parts of `useDialogSubject` a dialog needs to open, close, and finish closing. */
export type DialogControl = Pick<
	ReturnType<typeof useDialogSubject>,
	"close" | "finalFocus" | "onOpenChangeComplete" | "open"
>;

/** Confirms a destructive action, keeping the dialog open while it runs and showing its error. */
export function ConfirmDialog({
	confirmLabel,
	description,
	mutation,
	onConfirm,
	onOpenChange,
	onOpenChangeComplete,
	open,
	pendingLabel,
	title,
}: {
	confirmLabel: string;
	description: ReactNode;
	mutation: { error: Error | null; isPending: boolean };
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	onOpenChangeComplete: (open: boolean) => void;
	open: boolean;
	pendingLabel: string;
	title: string;
}) {
	return (
		<AlertDialog
			onOpenChange={(nextOpen) => {
				if (!mutation.isPending) onOpenChange(nextOpen);
			}}
			onOpenChangeComplete={onOpenChangeComplete}
			open={open}
		>
			<AlertDialogPopup>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription className="[overflow-wrap:anywhere]">
						{description}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{mutation.error && (
					<Alert className="mx-6 mb-4" variant="error">
						<AlertDescription>{mutation.error.message}</AlertDescription>
					</Alert>
				)}
				<AlertDialogFooter>
					<AlertDialogClose
						disabled={mutation.isPending}
						render={<Button type="button" variant="ghost" />}
					>
						Cancel
					</AlertDialogClose>
					<Button
						disabled={mutation.isPending}
						onClick={onConfirm}
						type="button"
						variant="destructive"
					>
						{mutation.isPending ? pendingLabel : confirmLabel}
					</Button>
				</AlertDialogFooter>
			</AlertDialogPopup>
		</AlertDialog>
	);
}
