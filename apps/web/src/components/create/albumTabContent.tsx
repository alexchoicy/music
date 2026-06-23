import { useSuspenseQuery } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import { useState } from "react";
import type { Accept } from "react-dropzone";

import { DropBox } from "#/components/dropBox";
import { partyQueries } from "#/lib/queries/party.queries";
import { useAlbumUploadStore } from "#/store/albumUploadStore";
import type { AlbumLocalId, TrackLocalId } from "#/store/albumUploadStoreType";

import { Button } from "../coss/button";
import { toastManager } from "../coss/toast";
import { AlbumDraftCard } from "./album/albumDraftCard";
import { AlbumDraftEditDialog } from "./album/albumDraftEditDialog";
import { AlbumDraftMergeDialog } from "./album/albumDraftMergeDialog";
import { TrackDraftEditDialog } from "./album/trackDraftEditDialog";

const albumAudioAccept: Accept = {
	"audio/*": [".flac", ".mp3", ".wav"],
};

export function AlbumTabContent() {
	const addDroppedFiles = useAlbumUploadStore((state) => state.addDroppedFiles);
	const submitAlbums = useAlbumUploadStore((state) => state.submitAlbums);
	// const { data: languages } = useSuspenseQuery(languageQueries.getLanguages());
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());
	const isProcessing = useAlbumUploadStore((state) => state.isProcessing);
	const submitStatus = useAlbumUploadStore((state) => state.submitStatus);
	const albumOrder = useAlbumUploadStore((state) => state.albumOrder);

	const [albumDraftToEdit, setAlbumDraftToEdit] = useState<AlbumLocalId | null>(
		null,
	);
	const [albumDraftToMerge, setAlbumDraftToMerge] =
		useState<AlbumLocalId | null>(null);
	const [trackDraftToEdit, setTrackDraftToEdit] = useState<TrackLocalId | null>(
		null,
	);

	async function handleDrop(acceptedFiles: File[]) {
		const result = await addDroppedFiles(acceptedFiles, parties);

		if (result.processedFileNames.length > 0) {
			toastManager.add({
				title: `${result.processedFileNames.length} Files processed successfully`,
				type: "success",
			});
		}

		if (result.ignoredFileNames.length > 0) {
			toastManager.add({
				title: `Some files could not be processed`,
				description: `${result.ignoredFileNames.join(", ")}`,
				type: "error",
			});
		}
	}

	async function handleSubmit() {
		try {
			await submitAlbums();
			setAlbumDraftToEdit(null);
			setAlbumDraftToMerge(null);
			setTrackDraftToEdit(null);
			toastManager.add({
				title: "Album upload started",
				type: "success",
			});
		} catch (error) {
			toastManager.add({
				title: "Album upload failed",
				description:
					error instanceof Error ? error.message : "Unable to upload album",
				type: "error",
			});
		}
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-xl font-semibold tracking-tight">Album</h1>
					<p className="text-sm text-muted-foreground">
						Drop audio files to build local album drafts before upload.
					</p>
				</div>
				<Button
					disabled={
						albumOrder.length === 0 ||
						submitStatus === "uploading" ||
						isProcessing
					}
					loading={submitStatus === "uploading" || isProcessing}
					onClick={handleSubmit}
				>
					<UploadIcon aria-hidden="true" />
					{submitStatus === "uploading" ? "Uploading..." : "Submit"}
				</Button>
			</div>
			<DropBox
				isProcessing={isProcessing}
				accept={albumAudioAccept}
				activeHint="Drop the album audio files here."
				errorHint="Only FLAC, MP3, or WAV audio files are supported."
				hint="Drag and drop FLAC, MP3, or WAV files here, or browse from your device."
				onDrop={handleDrop}
				title="Choose album files"
			/>

			{albumOrder.length > 0 && (
				<div className="grid gap-4">
					{albumOrder.map((albumId) => {
						return (
							<AlbumDraftCard
								key={albumId}
								albumID={albumId}
								onOpenAlbumDraftMergeDialog={setAlbumDraftToMerge}
								onOpenAlbumDraftDialog={setAlbumDraftToEdit}
								onOpenTrackDraftDialog={setTrackDraftToEdit}
							/>
						);
					})}
				</div>
			)}

			{albumDraftToEdit !== null && (
				<AlbumDraftEditDialog
					key={albumDraftToEdit}
					albumId={albumDraftToEdit}
					onOpenChange={(open) => {
						if (!open) setAlbumDraftToEdit(null);
					}}
				/>
			)}

			{albumDraftToMerge !== null && (
				<AlbumDraftMergeDialog
					key={albumDraftToMerge}
					albumId={albumDraftToMerge}
					onOpenChange={(open) => {
						if (!open) setAlbumDraftToMerge(null);
					}}
				/>
			)}

			{trackDraftToEdit !== null && (
				<TrackDraftEditDialog
					key={trackDraftToEdit}
					trackId={trackDraftToEdit}
					onOpenChange={(open) => {
						if (!open) setTrackDraftToEdit(null);
					}}
				/>
			)}
		</section>
	);
}
