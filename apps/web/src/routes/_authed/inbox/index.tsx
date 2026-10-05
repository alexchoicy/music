import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { InboxIcon } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Label } from "#/components/coss/label";
import { Spinner } from "#/components/coss/spinner";
import { Switch } from "#/components/coss/switch";
import { LibraryEmptyState } from "#/components/LibraryEmptyState";
import { inboxQueries } from "#/lib/queries/inbox.queries";
import type { InboxGroupListItem } from "#/lib/queries/inbox.queries";
import { formatDate } from "#/lib/utils/date";
import { formatFileSize } from "#/lib/utils/file";

export const Route = createFileRoute("/_authed/inbox/")({
	component: InboxPage,
	loader: ({ context }) => {
		context.queryClient.prefetchQuery(inboxQueries.groups(false));
	},
});

function InboxPage() {
	const switchId = useId();
	const [includeResolved, setIncludeResolved] = useState(false);
	const { data: groups, isPending } = useQuery(
		inboxQueries.groups(includeResolved),
	);

	return (
		<main className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold sm:text-3xl">Inbox</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Dropped files waiting to be sorted into albums. Files dropped
						together stay together.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id={switchId}
						checked={includeResolved}
						onCheckedChange={setIncludeResolved}
					/>
					<Label htmlFor={switchId}>Show sorted groups</Label>
				</div>
			</header>

			{isPending ? (
				<div className="flex justify-center py-12">
					<Spinner />
				</div>
			) : !groups || groups.length === 0 ? (
				<LibraryEmptyState
					icon={<InboxIcon />}
					title="Inbox is empty"
					description="Files dropped from the Create page will show up here."
				/>
			) : (
				<ul className="grid gap-3">
					{groups.map((group) => (
						<li key={group.groupId}>
							<InboxGroupRow group={group} />
						</li>
					))}
				</ul>
			)}
		</main>
	);
}

function InboxGroupRow({ group }: { group: InboxGroupListItem }) {
	const fileCount =
		Number(group.pendingCount) +
		Number(group.claimedCount) +
		Number(group.discardedCount);
	const albums = group.albums.slice(0, 3);

	return (
		<Link
			to="/inbox/$id"
			params={{ id: group.groupId }}
			className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="truncate font-medium">
					{albums.length > 0 ? albums.join(" · ") : "No album tags"}
					{group.albums.length > albums.length && (
						<span className="text-muted-foreground">
							{" "}
							+{group.albums.length - albums.length} more
						</span>
					)}
				</p>
				<p className="text-sm text-muted-foreground">
					{group.uploadedByUserName || "Unknown user"} ·{" "}
					{formatDate(group.createdAt)} · {fileCount} files
					{formatFileSize(group.totalSizeInBytes) &&
						` · ${formatFileSize(group.totalSizeInBytes)}`}
				</p>
				{group.note && (
					<p className="line-clamp-2 text-sm text-muted-foreground italic">
						“{group.note}”
					</p>
				)}
			</div>
			<div className="flex shrink-0 flex-wrap gap-1.5">
				{Number(group.pendingCount) > 0 && (
					<Badge variant="warning">{group.pendingCount} to sort</Badge>
				)}
				{Number(group.claimedCount) > 0 && (
					<Badge variant="success">{group.claimedCount} in albums</Badge>
				)}
				{Number(group.discardedCount) > 0 && (
					<Badge variant="secondary">{group.discardedCount} discarded</Badge>
				)}
			</div>
		</Link>
	);
}
