import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLinesIcon, GripVerticalIcon, PencilIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type { AlbumEditDetails } from "#/lib/queries/albumEdit.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

import { TrackAudiosDialog } from "./TrackAudiosDialog";
import { discKey, toTracksDraft, toTracksRequest } from "./trackDraft";
import type { TrackDraft, TracksDraft } from "./trackDraft";
import { TrackEditDialog } from "./TrackEditDialog";

function TrackRow({
	track,
	index,
	group,
	artistNames,
	audioCount,
	disabled,
	onTitleChange,
	onEdit,
	onEditAudios,
}: {
	track: TrackDraft;
	index: number;
	group: string;
	artistNames: string;
	audioCount: number;
	disabled: boolean;
	onTitleChange: (title: string) => void;
	onEdit: () => void;
	onEditAudios: () => void;
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
				"grid grid-cols-[2rem_1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-accent/60",
				isDragging && "opacity-50",
			)}
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
			<div className="flex min-w-0 flex-col gap-1">
				<Input
					aria-label={`Title of track ${index + 1}`}
					disabled={disabled}
					onChange={(event) => onTitleChange(event.target.value)}
					size="sm"
					value={track.title}
				/>
				<div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
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
			<div className="flex items-center gap-1">
				<span className="mr-1 hidden text-xs text-muted-foreground tabular-nums sm:inline">
					{formatMsToMMSSOrHMMSS(track.durationInMs)}
				</span>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label={`Audio versions of ${track.title}`}
								onClick={onEditAudios}
								size="xs"
								variant="ghost"
							/>
						}
					>
						<AudioLinesIcon aria-hidden="true" />
						<span className="tabular-nums">{audioCount}</span>
					</TooltipTrigger>
					<TooltipPopup>Audio versions</TooltipPopup>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label={`Edit ${track.title}`}
								disabled={disabled}
								onClick={onEdit}
								size="icon-sm"
								variant="ghost"
							/>
						}
					>
						<PencilIcon aria-hidden="true" />
					</TooltipTrigger>
					<TooltipPopup>Edit track</TooltipPopup>
				</Tooltip>
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
				"-mx-2 flex min-h-14 flex-col rounded-lg",
				isDropTarget && "ring-2 ring-primary ring-inset",
			)}
			ref={ref}
		>
			{isEmpty ? (
				<p className="px-2 py-4 text-sm text-muted-foreground">
					No tracks. Drag tracks here.
				</p>
			) : (
				children
			)}
		</div>
	);
}

export function AlbumTracksEditor({
	album,
	onDirtyChange,
}: {
	album: AlbumEditDetails;
	onDirtyChange: (isDirty: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const initial = toTracksDraft(album);
	const [draft, setDraft] = useState<TracksDraft>(initial);
	const [editing, setEditing] = useState<TrackDraft | null>(null);
	const [audioTrackId, setAudioTrackId] = useState<number | null>(null);
	const beforeDrag = useRef<TracksDraft["tracksByDisc"] | null>(null);
	const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => onDirtyChange(false);
	}, [isDirty, onDirtyChange]);

	const { data: parties = [] } = useQuery(partyQueries.getParties());
	const partyNames = new Map(
		parties.map((party) => [Number(party.partyId), party.name]),
	);
	const audioCounts = new Map(
		album.discs.flatMap((disc) =>
			disc.tracks.map((track) => [Number(track.trackId), track.audios.length]),
		),
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
		<div className="flex max-w-4xl flex-col gap-8">
			<p className="text-sm text-muted-foreground">
				Drag tracks to reorder them or move them to another disc. Track numbers
				follow the order. Audio versions save right away.
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
						<section className="flex flex-col gap-3" key={disc.albumDiscId}>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
								<h2 className="text-xl font-semibold tracking-tight">
									Disc {disc.discNumber}
								</h2>
								<Input
									aria-label={`Disc ${disc.discNumber} subtitle`}
									className="max-w-sm flex-1"
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
									size="sm"
									value={disc.subtitle}
								/>
							</div>
							<DiscTrackList group={group} isEmpty={tracks.length === 0}>
								{tracks.map((track, index) => (
									<TrackRow
										artistNames={track.artistIds
											.map((id) => partyNames.get(id) ?? "Unknown artist")
											.join(", ")}
										audioCount={audioCounts.get(track.trackId) ?? 0}
										disabled={mutation.isPending}
										group={group}
										index={index}
										key={track.id}
										onEdit={() => setEditing(track)}
										onEditAudios={() => setAudioTrackId(track.trackId)}
										onTitleChange={(title) => updateTrack({ ...track, title })}
										track={track}
									/>
								))}
							</DiscTrackList>
						</section>
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
				<TrackEditDialog
					key={editing.id}
					onClose={() => setEditing(null)}
					onSave={updateTrack}
					track={editing}
				/>
			)}

			{audioTrackId !== null && (
				<TrackAudiosDialog
					album={album}
					key={audioTrackId}
					onClose={() => setAudioTrackId(null)}
					trackId={audioTrackId}
				/>
			)}
		</div>
	);
}
