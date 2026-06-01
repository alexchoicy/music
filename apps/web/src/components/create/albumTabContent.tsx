"use client";

import type { Accept } from "react-dropzone";

import { AudioDropBox } from "#/components/audioDropBox";
import { processDroppedFiles } from "#/lib/utils/upload";

const albumAudioAccept: Accept = {
	"audio/*": [".flac", ".mp3", ".wav"],
};

export function AlbumTabContent() {
	async function handleDrop(acceptedFiles: File[]) {
		const files = await processDroppedFiles(acceptedFiles);
		console.log(files);
	}

	return (
		<section className="flex flex-col gap-4">
			<h1 className="text-xl font-semibold tracking-tight">Album</h1>
			<p className="text-sm text-muted-foreground">Album content area</p>
			<AudioDropBox
				accept={albumAudioAccept}
				activeHint="Drop the album audio files here."
				errorHint="Only FLAC, MP3, or WAV audio files are supported."
				hint="Drag and drop FLAC, MP3, or WAV files here, or browse from your device."
				onDrop={handleDrop}
				title="Choose album files"
			/>
		</section>
	);
}
