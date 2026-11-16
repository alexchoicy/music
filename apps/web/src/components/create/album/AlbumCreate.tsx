import { useSuspenseQuery } from "@tanstack/react-query";
import { ListChecksIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Button } from "#/components/base/button";
import { Checkbox } from "#/components/base/checkbox";
import { Label } from "#/components/base/label";
import { toastManager } from "#/components/base/toast";
import { UploadDropZone } from "#/components/upload/UploadDropZone";
import { AUDIO_FILE_ACCEPT } from "#/constant/album";
import { partyQueries } from "#/lib/queries/party.queries";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import { getTrackIssues } from "#/store/albumUploadStoreFunction";
import type { AlbumLocalId, TrackLocalId } from "#/store/albumUploadStoreType";

import { AlbumDraftDialog } from "./AlbumDraftDialog";
import { AlbumDraftSection } from "./AlbumDraftSection";
import { BulkEditDialog } from "./BulkEditDialog";
import { MergeDraftDialog } from "./MergeDraftDialog";
import { TrackDraftDialog } from "./TrackDraftDialog";

type OpenDialog =
	| { kind: "album" | "merge"; albumId: AlbumLocalId }
	| { kind: "track"; trackId: TrackLocalId }
	| { kind: "bulk"; trackIds: TrackLocalId[] };

export function AlbumCreate() {
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());
	const addDroppedFiles = useAlbumUploadStore((state) => state.addDroppedFiles);
	const submitAlbums = useAlbumUploadStore((state) => state.submitAlbums);
	const removeTracks = useAlbumUploadStore((state) => state.removeTracks);
	const isProcessing = useAlbumUploadStore((state) => state.isProcessing);
	const isUploading = useAlbumUploadStore(
		(state) => state.submitStatus === "uploading",
	);
	const albumOrder = useAlbumUploadStore((state) => state.albumOrder);
	const allTrackIds = useAlbumUploadStore(
		useShallow((state) =>
			state.albumOrder.flatMap((albumId) =>
				state.albumsById[albumId].discIds.flatMap(
					(discId) => state.discsById[discId].trackIds,
				),
			),
		),
	);
	const issues = useAlbumUploadStore(useShallow(getTrackIssues));

	const [selection, setSelection] = useState<ReadonlySet<TrackLocalId>>(
		() => new Set(),
	);
	const [dialog, setDialog] = useState<OpenDialog | null>(null);

	const selectedIds = allTrackIds.filter((trackId) => selection.has(trackId));
	const selected = new Set(selectedIds);
	const issueCount = Object.keys(issues).length;
	const albumCount = albumOrder.length;

	function select(trackIds: TrackLocalId[], isSelected: boolean) {
		const next = new Set(selected);
		for (const trackId of trackIds) {
			if (isSelected) next.add(trackId);
			else next.delete(trackId);
		}
		setSelection(next);
	}

	async function handleDrop(acceptedFiles: File[]) {
		const result = await addDroppedFiles(acceptedFiles, parties);

		if (result.ignoredFileNames.length > 0) {
			toastManager.add({
				title: "Some files could not be added",
				description: result.ignoredFileNames.join(", "),
				type: "error",
			});
		}
	}

	async function handleSubmit() {
		try {
			const result = await submitAlbums();
			setDialog(null);

			if (result.createdCount > 0) {
				toastManager.add({
					title: `Created ${result.createdCount} album${result.createdCount === 1 ? "" : "s"}, uploading audio`,
					type: "success",
				});
			}

			for (const failure of result.failed) {
				toastManager.add({
					title: `Could not create “${failure.title}”`,
					description: failure.message,
					type: "error",
				});
			}
		} catch (error) {
			toastManager.add({
				title: "Could not create albums",
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	}

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
			<UploadDropZone
				accept={AUDIO_FILE_ACCEPT}
				description="FLAC, MP3, WAV, or DSF. Files are grouped into albums by their tags."
				isProcessing={isProcessing}
				onDrop={handleDrop}
				rejectDescription="Only FLAC, MP3, WAV, or DSF audio files are supported."
				title="Drop audio files or browse"
			/>

			{albumCount > 0 && (
				<>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-background py-2 md:sticky md:top-0 md:z-30">
						<Label>
							<Checkbox
								checked={
									selectedIds.length > 0 &&
									selectedIds.length === allTrackIds.length
								}
								indeterminate={
									selectedIds.length > 0 &&
									selectedIds.length < allTrackIds.length
								}
								onCheckedChange={(checked) => select(allTrackIds, checked)}
							/>
							<span className="tabular-nums">
								{selectedIds.length > 0
									? `${selectedIds.length} of ${allTrackIds.length} tracks selected`
									: `${allTrackIds.length} track${allTrackIds.length === 1 ? "" : "s"} in ${albumCount} album${albumCount === 1 ? "" : "s"}`}
							</span>
						</Label>
						<div className="ms-auto flex flex-wrap items-center gap-2">
							{selectedIds.length > 0 && (
								<Button
									disabled={isUploading}
									onClick={() => removeTracks(selectedIds)}
									variant="destructive-outline"
								>
									<Trash2Icon aria-hidden="true" />
									Remove
								</Button>
							)}
							<Button
								disabled={isUploading}
								onClick={() =>
									setDialog({
										kind: "bulk",
										trackIds:
											selectedIds.length > 0 ? selectedIds : allTrackIds,
									})
								}
								variant="outline"
							>
								<ListChecksIcon aria-hidden="true" />
								{selectedIds.length > 0
									? "Bulk edit selected"
									: "Bulk edit all"}
							</Button>
							<Button
								disabled={isProcessing || issueCount > 0}
								loading={isUploading}
								onClick={handleSubmit}
							>
								<UploadIcon aria-hidden="true" />
								Create {albumCount} album{albumCount === 1 ? "" : "s"}
							</Button>
						</div>
					</div>

					{issueCount > 0 && (
						<Alert variant="error">
							<AlertTitle>
								{issueCount} tracks share a track number on the same disc
							</AlertTitle>
							<AlertDescription>
								Remove the duplicates, edit their numbers, or select them and
								renumber with bulk edit.
							</AlertDescription>
						</Alert>
					)}

					<div className="flex flex-col gap-8">
						{albumOrder.map((albumId) => (
							<AlbumDraftSection
								albumId={albumId}
								canMerge={albumCount > 1}
								issues={issues}
								key={albumId}
								onEdit={(id) => setDialog({ kind: "album", albumId: id })}
								onEditTrack={(trackId) => setDialog({ kind: "track", trackId })}
								onMerge={(id) => setDialog({ kind: "merge", albumId: id })}
								onSelect={select}
								selected={selected}
							/>
						))}
					</div>
				</>
			)}

			{dialog?.kind === "album" && (
				<AlbumDraftDialog
					albumId={dialog.albumId}
					key={dialog.albumId}
					onClose={() => setDialog(null)}
				/>
			)}
			{dialog?.kind === "merge" && (
				<MergeDraftDialog
					albumId={dialog.albumId}
					key={dialog.albumId}
					onClose={() => setDialog(null)}
				/>
			)}
			{dialog?.kind === "track" && (
				<TrackDraftDialog
					key={dialog.trackId}
					onClose={() => setDialog(null)}
					trackId={dialog.trackId}
				/>
			)}
			{dialog?.kind === "bulk" && (
				<BulkEditDialog
					onClose={() => setDialog(null)}
					trackIds={dialog.trackIds}
				/>
			)}
		</section>
	);
}
