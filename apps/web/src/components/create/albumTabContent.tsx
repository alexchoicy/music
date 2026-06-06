import { useSuspenseQuery } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import type { Accept } from "react-dropzone";

import { DropBox } from "#/components/dropBox";
import { languageQueries } from "#/lib/queries/language.queries";
import { partyQueries } from "#/lib/queries/party.queries";
import { useAlbumUploadStore } from "#/store/albumUploadStore";

import { Button } from "../coss/button";
import { toastManager } from "../coss/toast";
import { AlbumDraftCard } from "./album/albumDraftCard";

const albumAudioAccept: Accept = {
	"audio/*": [".flac", ".mp3", ".wav"],
};

export function AlbumTabContent() {
	const addDroppedFiles = useAlbumUploadStore((state) => state.addDroppedFiles);
	const { data: languages } = useSuspenseQuery(languageQueries.getLanguages());
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());
	const isProcessing = useAlbumUploadStore((state) => state.isProcessing);
	const submitStatus = useAlbumUploadStore((state) => state.submitStatus);
	const albumOrder = useAlbumUploadStore((state) => state.albumOrder);

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
						return <AlbumDraftCard key={albumId} albumID={albumId} />;
					})}
				</div>
			)}
		</section>
	);
}
