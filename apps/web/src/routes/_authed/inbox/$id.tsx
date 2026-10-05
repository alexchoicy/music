import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArchiveRestoreIcon,
	ArrowLeftIcon,
	DiscAlbumIcon,
	PauseIcon,
	PlayIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Checkbox } from "#/components/coss/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { toastManager } from "#/components/coss/toast";
import { $APIFetch } from "#/lib/APIFetchClient";
import { inboxActions, inboxQueries } from "#/lib/queries/inbox.queries";
import type { InboxItemDetails } from "#/lib/queries/inbox.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { formatDate } from "#/lib/utils/date";
import { formatFileSize } from "#/lib/utils/file";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { useAlbumUploadStore } from "#/store/albumUploadStore";

export const Route = createFileRoute("/_authed/inbox/$id")({
	component: InboxGroupPage,
	loader: ({ context, params }) => {
		context.queryClient.prefetchQuery(inboxQueries.group(params.id));
		context.queryClient.prefetchQuery(partyQueries.getParties());
	},
});

function InboxGroupPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: group } = useSuspenseQuery(inboxQueries.group(id));
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());
	const addInboxItems = useAlbumUploadStore((state) => state.addInboxItems);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [preview, setPreview] = useState<{
		itemId: string;
		url: string;
	} | null>(null);

	const selectedItems = group.items.filter((item) =>
		selectedIds.has(item.itemId),
	);
	const selectedPending = selectedItems.filter(
		(item) => item.status === "Pending",
	);
	const selectedDiscarded = selectedItems.filter(
		(item) => item.status === "Discarded",
	);
	const selectableItems = group.items.filter(
		(item) => item.status !== "Claimed",
	);
	const allSelected =
		selectableItems.length > 0 &&
		selectableItems.every((item) => selectedIds.has(item.itemId));

	const { isPending: isChangingStatus, mutate: changeStatus } = useMutation({
		mutationFn: async ({
			action,
			itemIds,
		}: {
			action: "discard" | "restore";
			itemIds: string[];
		}) => inboxActions[action](itemIds),
		onSuccess: (_, { action, itemIds }) => {
			setSelectedIds(new Set());
			toastManager.add({
				title: `${itemIds.length} files ${action === "discard" ? "discarded" : "restored"}`,
				type: "success",
			});
		},
		onError: (error) => {
			toastManager.add({
				title: "Could not update files",
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: ["inbox"] }),
	});

	function toggleItem(itemId: string, checked: boolean) {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (checked) next.add(itemId);
			else next.delete(itemId);
			return next;
		});
	}

	async function togglePreview(item: InboxItemDetails) {
		if (preview?.itemId === item.itemId) {
			setPreview(null);
			return;
		}

		const result = await $APIFetch<string>(`/files/${item.fileObjectId}`);
		if (!result.ok) {
			toastManager.add({ title: "Could not load preview", type: "error" });
			return;
		}

		setPreview({ itemId: item.itemId, url: result.data });
	}

	async function formAlbum() {
		const result = addInboxItems(selectedPending, parties);

		if (result.ignoredFileNames.length > 0) {
			toastManager.add({
				title: "Some files are already in a draft",
				description: result.ignoredFileNames.join(", "),
				type: "warning",
			});
		}

		await navigate({ to: "/create" });
	}

	return (
		<main className="flex min-h-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-3">
				<Button
					className="self-start"
					render={<Link to="/inbox" />}
					size="sm"
					variant="ghost"
				>
					<ArrowLeftIcon aria-hidden="true" />
					Inbox
				</Button>
				<div>
					<h1 className="text-2xl font-semibold sm:text-3xl">Dropped files</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{group.uploadedByUserName || "Unknown user"} ·{" "}
						{formatDate(group.createdAt)} · {group.items.length} files
					</p>
					{group.note && (
						<p className="mt-2 text-sm text-muted-foreground italic">
							“{group.note}”
						</p>
					)}
				</div>
			</header>

			<div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-y bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
				<span className="mr-auto text-sm text-muted-foreground">
					{selectedItems.length > 0
						? `${selectedItems.length} selected`
						: "Select files to sort"}
				</span>
				<Button
					disabled={selectedPending.length === 0}
					onClick={formAlbum}
					size="sm"
				>
					<DiscAlbumIcon aria-hidden="true" />
					Form album
				</Button>
				<Button
					disabled={selectedPending.length === 0 || isChangingStatus}
					onClick={() =>
						changeStatus({
							action: "discard",
							itemIds: selectedPending.map((item) => item.itemId),
						})
					}
					size="sm"
					variant="outline"
				>
					<Trash2Icon aria-hidden="true" />
					Discard
				</Button>
				{selectedDiscarded.length > 0 && (
					<Button
						disabled={isChangingStatus}
						onClick={() =>
							changeStatus({
								action: "restore",
								itemIds: selectedDiscarded.map((item) => item.itemId),
							})
						}
						size="sm"
						variant="outline"
					>
						<ArchiveRestoreIcon aria-hidden="true" />
						Restore
					</Button>
				)}
			</div>

			{preview && (
				// oxlint-disable-next-line jsx-a11y/media-has-caption -- previewing raw dropped audio
				<audio
					autoPlay
					className="w-full"
					controls
					key={preview.url}
					onEnded={() => setPreview(null)}
					src={preview.url}
				/>
			)}

			<div className="overflow-hidden rounded-xl border border-border">
				<Table className="table-fixed">
					<TableHeader>
						<TableRow>
							<TableHead className="w-10">
								<Checkbox
									aria-label="Select all files"
									checked={allSelected}
									disabled={selectableItems.length === 0}
									onCheckedChange={(checked) =>
										setSelectedIds(
											checked
												? new Set(selectableItems.map((item) => item.itemId))
												: new Set(),
										)
									}
								/>
							</TableHead>
							<TableHead className="w-12" aria-label="Preview" />
							<TableHead>Title</TableHead>
							<TableHead className="hidden md:table-cell">Album</TableHead>
							<TableHead className="hidden w-20 lg:table-cell">
								Disc/Track
							</TableHead>
							<TableHead className="hidden w-40 lg:table-cell">
								Format
							</TableHead>
							<TableHead className="w-28 text-right">Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{group.items.map((item) => (
							<InboxItemRow
								key={item.itemId}
								item={item}
								isPlaying={preview?.itemId === item.itemId}
								isSelected={selectedIds.has(item.itemId)}
								onPreview={() => void togglePreview(item)}
								onSelect={(checked) => toggleItem(item.itemId, checked)}
							/>
						))}
					</TableBody>
				</Table>
			</div>
		</main>
	);
}

function InboxItemRow({
	item,
	isPlaying,
	isSelected,
	onPreview,
	onSelect,
}: {
	item: InboxItemDetails;
	isPlaying: boolean;
	isSelected: boolean;
	onPreview: () => void;
	onSelect: (checked: boolean) => void;
}) {
	const { tags, file } = item;
	const title = tags.title || file.originalFileName;
	const artists = (tags.artists ?? []).join(", ");
	const isUploaded = item.processingStatus !== "Pending";
	const discTrack = [tags.discNumber, tags.trackNumber]
		.map((value) => (value == null ? "–" : String(value)))
		.join("/");
	const format = [
		file.extension.toUpperCase(),
		file.lossless ? "Lossless" : null,
		file.audioSampleRate ? `${Number(file.audioSampleRate) / 1000} kHz` : null,
		file.bitsPerSample ? `${file.bitsPerSample}-bit` : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<TableRow data-state={isSelected ? "selected" : undefined}>
			<TableCell>
				<Checkbox
					aria-label={`Select ${title}`}
					checked={isSelected}
					disabled={item.status === "Claimed"}
					onCheckedChange={onSelect}
				/>
			</TableCell>
			<TableCell>
				<Button
					aria-label={isPlaying ? `Stop ${title}` : `Preview ${title}`}
					disabled={!isUploaded}
					onClick={onPreview}
					size="icon-sm"
					variant="ghost"
				>
					{isPlaying ? <PauseIcon /> : <PlayIcon />}
				</Button>
			</TableCell>
			<TableCell className="min-w-0">
				<p className="truncate font-medium">{title}</p>
				<p className="truncate text-xs text-muted-foreground">
					{artists || "No artist tag"}
					{file.durationInMs
						? ` · ${formatMsToMMSSOrHMMSS(Number(file.durationInMs))}`
						: ""}
				</p>
				{tags.title && (
					<p className="truncate text-xs text-muted-foreground">
						{file.originalFileName}
					</p>
				)}
			</TableCell>
			<TableCell className="hidden min-w-0 md:table-cell">
				<p className="truncate">{tags.album || "–"}</p>
				<p className="truncate text-xs text-muted-foreground">
					{(tags.albumArtists ?? []).join(", ")}
				</p>
			</TableCell>
			<TableCell className="hidden lg:table-cell">{discTrack}</TableCell>
			<TableCell className="hidden lg:table-cell">
				<p className="truncate text-xs">{format}</p>
				<p className="text-xs text-muted-foreground">
					{formatFileSize(file.sizeInBytes)}
				</p>
			</TableCell>
			<TableCell className="text-right">
				<InboxItemStatusBadge item={item} />
			</TableCell>
		</TableRow>
	);
}

function InboxItemStatusBadge({ item }: { item: InboxItemDetails }) {
	if (item.status === "Claimed")
		return <Badge variant="success">In album</Badge>;
	if (item.status === "Discarded")
		return <Badge variant="secondary">Discarded</Badge>;
	if (item.processingStatus === "Pending")
		return <Badge variant="warning">Uploading</Badge>;
	return <Badge variant="outline">To sort</Badge>;
}
