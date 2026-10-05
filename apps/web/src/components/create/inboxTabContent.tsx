import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useId, useState } from "react";
import type { Accept } from "react-dropzone";

import { Badge } from "#/components/coss/badge";
import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/coss/table";
import { toastManager } from "#/components/coss/toast";
import { DropBox } from "#/components/dropBox";
import { inboxActions } from "#/lib/queries/inbox.queries";
import {
	createAudioFileRequest,
	getAudioTags,
	processDroppedFiles,
} from "#/lib/utils/upload";
import type { ProcessedFileData } from "#/lib/utils/upload";
import { useUploadStore } from "#/store/uploadStore";

const inboxAudioAccept: Accept = {
	"audio/*": [".flac", ".mp3", ".wav", ".dsf"],
};

type DropResult = {
	id: string;
	fileName: string;
	blake3Hash: string | null;
	errorMessage: string | null;
};

export function InboxTabContent() {
	const noteId = useId();
	const [note, setNote] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [results, setResults] = useState<DropResult[]>([]);

	async function handleDrop(acceptedFiles: File[]) {
		if (acceptedFiles.length === 0) return;

		setIsProcessing(true);

		try {
			const { processedFiles, failedFileNames } = await processDroppedFiles(
				acceptedFiles,
				4,
				false,
			);
			const nextResults: DropResult[] = failedFileNames.map((fileName) => ({
				id: crypto.randomUUID(),
				fileName,
				blake3Hash: null,
				errorMessage: "Could not read this file",
			}));

			if (processedFiles.length > 0) {
				const filesByReference = new Map<string, ProcessedFileData>(
					processedFiles.map((fileData) => [crypto.randomUUID(), fileData]),
				);
				const created = await inboxActions.createGroup({
					note: note.trim() || null,
					items: [...filesByReference].map(([clientReferenceId, fileData]) => ({
						clientReferenceId,
						file: createAudioFileRequest(fileData),
						tags: getAudioTags(fileData.metadata),
					})),
				});

				const uploads = [];
				for (const item of created.items) {
					const fileData = filesByReference.get(item.clientReferenceId);

					if (item.isSuccess && item.upload && fileData) {
						useUploadStore
							.getState()
							.addFile(fileData.file, fileData.blake3Hash);
						uploads.push(item.upload);
					}

					nextResults.push({
						id: item.clientReferenceId,
						fileName: item.fileName,
						blake3Hash: fileData?.blake3Hash ?? null,
						errorMessage: item.isSuccess
							? null
							: (item.errorMessage ?? "Not added"),
					});
				}

				useUploadStore.getState().startUpload(uploads);
				if (uploads.length > 0) setNote("");
			}

			const addedCount = nextResults.filter(
				(result) => !result.errorMessage,
			).length;
			const skippedCount = nextResults.length - addedCount;

			if (addedCount > 0) {
				toastManager.add({
					title: `${addedCount} files dropped into the inbox`,
					description: "Uploading in the background.",
					type: "success",
				});
			}

			if (skippedCount > 0) {
				toastManager.add({
					title: `${skippedCount} files were not added`,
					type: "error",
				});
			}

			setResults((current) => [...nextResults, ...current]);
		} catch (error) {
			toastManager.add({
				title: "Drop failed",
				description:
					error instanceof Error ? error.message : "Unable to drop files",
				type: "error",
			});
		} finally {
			setIsProcessing(false);
		}
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="space-y-1">
				<h1 className="text-xl font-semibold tracking-tight">Drop</h1>
				<p className="text-sm text-muted-foreground">
					Drop audio files and go. Each drop is kept together as one group for
					an admin to sort into albums later.
				</p>
			</div>

			<Field name="note">
				<FieldLabel htmlFor={noteId}>Note for admins</FieldLabel>
				<Input
					id={noteId}
					maxLength={1000}
					onChange={(event) => setNote(event.target.value)}
					placeholder="e.g. Live recordings from the 2024 tour"
					value={note}
				/>
				<FieldDescription>Optional. Saved with the next drop.</FieldDescription>
			</Field>

			<DropBox
				isProcessing={isProcessing}
				accept={inboxAudioAccept}
				activeHint="Drop the audio files here."
				errorHint="Only FLAC, MP3, WAV, or DSF audio files are supported."
				hint="Drag and drop FLAC, MP3, WAV, or DSF files here, or browse from your device."
				onDrop={handleDrop}
				title="Drop audio files"
			/>

			{results.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-border">
					<Table className="table-fixed">
						<TableHeader>
							<TableRow>
								<TableHead>File</TableHead>
								<TableHead className="w-44 text-right sm:w-56">
									Result
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{results.map((result) => (
								<TableRow key={result.id}>
									<TableCell>
										<span className="block truncate">{result.fileName}</span>
									</TableCell>
									<TableCell className="text-right">
										<DropResultBadge result={result} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</section>
	);
}

function DropResultBadge({ result }: { result: DropResult }) {
	const upload = useUploadStore((state) =>
		result.blake3Hash ? state.fileByBlake3[result.blake3Hash] : undefined,
	);

	if (result.errorMessage) {
		return (
			<Badge variant="error">
				<XCircle aria-hidden="true" />
				{result.errorMessage}
			</Badge>
		);
	}

	if (upload?.status === "Failed") {
		return (
			<Badge variant="error">
				<XCircle aria-hidden="true" />
				Upload failed
			</Badge>
		);
	}

	if (upload?.status === "Uploading") {
		return (
			<Badge variant="warning">
				<Loader2 aria-hidden="true" className="animate-spin" />
				Uploading {upload.uploadedPartCount}/{upload.totalPartCount}
			</Badge>
		);
	}

	if (upload?.status === "Queued" || upload?.status === "Waiting") {
		return <Badge variant="secondary">Queued</Badge>;
	}

	return (
		<Badge variant="success">
			<CheckCircle aria-hidden="true" />
			Dropped
		</Badge>
	);
}
