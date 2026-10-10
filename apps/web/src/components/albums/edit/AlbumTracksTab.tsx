import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVerticalIcon, PencilIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { Input } from "#/components/coss/input";
import { toastManager } from "#/components/coss/toast";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type { AlbumEditDetails } from "#/lib/queries/albumEdit.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

import { TrackDetailsDialog } from "./TrackDetailsDialog";
import { discKey, toTracksDraft, toTracksRequest } from "./trackDraft";
import type { TrackDraft, TracksDraft } from "./trackDraft";

function TrackRow({
	track,
	index,
	group,
	artistNames,
	disabled,
	onTitleChange,
	onEdit,
}: {
	track: TrackDraft;
	index: number;
	group: string;
	artistNames: string;
	disabled: boolean;
	onTitleChange: (title: string) => void;
	onEdit: () => void;
}) {
	const { handleRef, isDragging, ref } = useSortable({
		id: track.id,
		index,
		group,
		type: "track",
		accept: "track",
		disabled,
	});

	return (
		<div
			className={cn(
				"grid grid-cols-[2rem_2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2",
				isDragging && "opacity-50",
			)}
			data-testid="edit-track-row"
			ref={ref}
		>
			<Button
				aria-label={`Drag ${track.title}`}
				disabled={disabled}
				ref={handleRef}
				size="icon-sm"
				variant="ghost"
			>
				<GripVerticalIcon aria-hidden="true" />
			</Button>
			<span className="text-center text-sm text-muted-foreground tabular-nums">
				{index + 1}
			</span>
			<div className="grid min-w-0 gap-1">
				<Input
					aria-label={`Title of track ${index + 1}`}
					disabled={disabled}
					onChange={(event) => onTitleChange(event.target.value)}
					size="sm"
					value={track.title}
				/>
				<div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					<span className="truncate">{artistNames || "No artists"}</span>
					{track.contentType !== "Music" && (
						<Badge size="sm" variant="secondary">
							{track.contentType === "MC" ? "Talk" : track.contentType}
						</Badge>
					)}
					{track.versionType !== "Original" && (
						<Badge size="sm" variant="secondary">
							{track.versionType}
						</Badge>
					)}
					{track.otherAlbumCount > 0 && (
						<Badge size="sm" variant="info">
							Also on {track.otherAlbumCount} other album
							{track.otherAlbumCount === 1 ? "" : "s"}
						</Badge>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-muted-foreground tabular-nums">
					{formatMsToMMSSOrHMMSS(track.durationInMs)}
				</span>
				<Button
					aria-label={`Edit ${track.title}`}
					disabled={disabled}
					onClick={onEdit}
					size="icon-sm"
					variant="ghost"
				>
					<PencilIcon aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
}

function DiscTrackList({
	group,
	children,
	isEmpty,
}: {
	group: string;
	children: React.ReactNode;
	isEmpty: boolean;
}) {
	// Lets tracks be dropped into an empty disc
	const { ref, isDropTarget } = useDroppable({
		id: group,
		type: "disc",
		accept: "track",
	});

	return (
		<div
			className={cn(
				"min-h-14 divide-y rounded-xl border",
				isDropTarget && "border-primary",
			)}
			ref={ref}
		>
			{isEmpty ? (
				<p className="px-4 py-4 text-sm text-muted-foreground">
					No tracks. Drag tracks here.
				</p>
			) : (
				children
			)}
		</div>
	);
}

export function AlbumTracksTab({ album }: { album: AlbumEditDetails }) {
	const queryClient = useQueryClient();
	const initial = toTracksDraft(album);
	const [draft, setDraft] = useState<TracksDraft>(initial);
	const [editing, setEditing] = useState<TrackDraft | null>(null);
	const beforeDrag = useRef<TracksDraft["tracksByDisc"] | null>(null);
	const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);

	const { data: parties = [] } = useQuery(partyQueries.getParties());
	const partyNames = new Map(
		parties.map((party) => [Number(party.partyId), party.name]),
	);

	const mutation = useMutation({
		mutationFn: () =>
			albumEditActions.updateTracks(
				album.albumId,
				toTracksRequest(draft, album.version),
			),
		onSuccess: (updated) => {
			applyAlbumEdit(queryClient, album.albumId, updated);
			setDraft(toTracksDraft(updated));
			toastManager.add({ title: "Tracks saved", type: "success" });
		},
	});

	function updateTrack(next: TrackDraft) {
		setDraft((current) => ({
			...current,
			tracksByDisc: Object.fromEntries(
				Object.entries(current.tracksByDisc).map(([key, tracks]) => [
					key,
					tracks.map((track) => (track.id === next.id ? next : track)),
				]),
			),
		}));
	}

	const hasEmptyTitle = Object.values(draft.tracksByDisc).some((tracks) =>
		tracks.some((track) => !track.title.trim()),
	);

	return (
		<div className="grid max-w-4xl gap-4">
			<p className="text-sm text-muted-foreground">
				Drag tracks to reorder them or move them to another disc. Track numbers
				follow the order.
			</p>

			<DragDropProvider
				onDragStart={() => {
					beforeDrag.current = draft.tracksByDisc;
				}}
				onDragOver={(event) => {
					setDraft((current) => ({
						...current,
						tracksByDisc: move(current.tracksByDisc, event),
					}));
				}}
				onDragEnd={(event) => {
					if (event.canceled && beforeDrag.current) {
						const restored = beforeDrag.current;
						setDraft((current) => ({ ...current, tracksByDisc: restored }));
					}
					beforeDrag.current = null;
				}}
			>
				{draft.discs.map((disc) => {
					const group = discKey(disc.albumDiscId);
					const tracks = draft.tracksByDisc[group] ?? [];

					return (
						<Card key={disc.albumDiscId}>
							<CardHeader>
								<CardTitle>Disc {disc.discNumber}</CardTitle>
							</CardHeader>
							<CardPanel>
								<div className="grid gap-3">
									<Input
										aria-label={`Disc ${disc.discNumber} subtitle`}
										disabled={mutation.isPending}
										onChange={(event) => {
											const subtitle = event.target.value;
											setDraft((current) => ({
												...current,
												discs: current.discs.map((item) =>
													item.albumDiscId === disc.albumDiscId
														? { ...item, subtitle }
														: item,
												),
											}));
										}}
										placeholder="Disc subtitle (optional)"
										value={disc.subtitle}
									/>
									<DiscTrackList group={group} isEmpty={tracks.length === 0}>
										{tracks.map((track, index) => (
											<TrackRow
												artistNames={track.artistIds
													.map((id) => partyNames.get(id) ?? "Unknown artist")
													.join(", ")}
												disabled={mutation.isPending}
												group={group}
												index={index}
												key={track.id}
												onEdit={() => setEditing(track)}
												onTitleChange={(title) =>
													updateTrack({ ...track, title })
												}
												track={track}
											/>
										))}
									</DiscTrackList>
								</div>
							</CardPanel>
						</Card>
					);
				})}
			</DragDropProvider>

			{mutation.error && (
				<Alert variant="error">
					<AlertDescription>{mutation.error.message}</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end gap-2">
				<Button
					disabled={!isDirty || mutation.isPending}
					onClick={() => setDraft(initial)}
					variant="ghost"
				>
					Reset
				</Button>
				<Button
					disabled={!isDirty || hasEmptyTitle || mutation.isPending}
					onClick={() => mutation.mutate()}
				>
					{mutation.isPending ? "Saving…" : "Save tracks"}
				</Button>
			</div>

			{editing && (
				<TrackDetailsDialog
					key={editing.id}
					onClose={() => setEditing(null)}
					onSave={updateTrack}
					track={editing}
				/>
			)}
		</div>
	);
}
