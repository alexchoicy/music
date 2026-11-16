import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { UploadIcon } from "lucide-react";
import { useId } from "react";
import type { Accept } from "react-dropzone";

import { AlbumCombobox } from "#/components/album/AlbumCombobox";
import { ReleaseDateField } from "#/components/album/edit/ReleaseDateField";
import { Button } from "#/components/base/button";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { Textarea } from "#/components/base/textarea";
import { toastManager } from "#/components/base/toast";
import { PartyCombobox } from "#/components/party/PartyCombobox";
import { UploadDropZone } from "#/components/upload/UploadDropZone";
import { useConcertUploadStore } from "#/store/concertUploadStore";

import { ConcertFileRow } from "./ConcertFileRow";
import { ConcertImageField } from "./ConcertImageField";

const CONCERT_FILE_ACCEPT: Accept = {
	"video/*": [".mkv", ".mov", ".mp4", ".webm"],
	"video/x-matroska": [".mkv"],
};

export function ConcertCreate() {
	const titleId = useId();
	const descriptionId = useId();

	const title = useConcertUploadStore((state) => state.title);
	const date = useConcertUploadStore((state) => state.date);
	const description = useConcertUploadStore((state) => state.description);
	const mainPartyIds = useConcertUploadStore((state) => state.mainPartyIds);
	const guestIds = useConcertUploadStore((state) => state.guestIds);
	const linkedAlbumIds = useConcertUploadStore((state) => state.linkedAlbumIds);
	const files = useConcertUploadStore((state) => state.files);
	const isProcessing = useConcertUploadStore((state) => state.isProcessing);
	const submitStatus = useConcertUploadStore((state) => state.submitStatus);
	const setTitle = useConcertUploadStore((state) => state.setTitle);
	const setDate = useConcertUploadStore((state) => state.setDate);
	const setDescription = useConcertUploadStore((state) => state.setDescription);
	const setMainPartyIds = useConcertUploadStore(
		(state) => state.setMainPartyIds,
	);
	const setGuestIds = useConcertUploadStore((state) => state.setGuestIds);
	const setLinkedAlbumIds = useConcertUploadStore(
		(state) => state.setLinkedAlbumIds,
	);
	const setFiles = useConcertUploadStore((state) => state.setFiles);
	const addDroppedFiles = useConcertUploadStore(
		(state) => state.addDroppedFiles,
	);
	const updateFileDraft = useConcertUploadStore(
		(state) => state.updateFileDraft,
	);
	const removeFileDraft = useConcertUploadStore(
		(state) => state.removeFileDraft,
	);
	const submitConcert = useConcertUploadStore((state) => state.submitConcert);

	const isUploading = submitStatus === "uploading";
	const isSubmitted = submitStatus === "completed";

	async function handleDrop(acceptedFiles: File[]) {
		const result = await addDroppedFiles(acceptedFiles);

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
			await submitConcert();
			toastManager.add({
				title: "Created concert, uploading files",
				type: "success",
			});
		} catch (error) {
			toastManager.add({
				title: "Could not create concert",
				description: error instanceof Error ? error.message : undefined,
				type: "error",
			});
		}
	}

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-xl font-semibold tracking-tight">Concert</h1>
				<Button
					disabled={!title.trim() || isProcessing || isSubmitted}
					loading={isUploading}
					onClick={handleSubmit}
				>
					<UploadIcon aria-hidden="true" />
					{isSubmitted ? "Submitted" : "Create concert"}
				</Button>
			</div>

			<div className="grid items-start gap-8 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
				<section className="flex min-w-0 flex-col gap-5">
					<h2 className="text-xl font-semibold tracking-tight">Details</h2>

					<ConcertImageField />

					<Field>
						<FieldLabel htmlFor={titleId}>Title</FieldLabel>
						<Input
							id={titleId}
							onChange={(event) => setTitle(event.target.value)}
							value={title}
						/>
					</Field>

					<ReleaseDateField
						label="Date"
						name="concert-date"
						onChange={setDate}
						placeholder="Select concert date"
						value={date}
					/>

					<Field>
						<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
						<Textarea
							id={descriptionId}
							onChange={(event) => setDescription(event.target.value)}
							rows={4}
							value={description}
						/>
					</Field>

					<Field>
						<FieldLabel nativeLabel={false} render={<div />}>
							Main parties
						</FieldLabel>
						<PartyCombobox
							allowCreate
							ariaLabel="Main parties"
							filterOutIds={guestIds}
							placeholder="Search or create main parties..."
							selectedIds={mainPartyIds}
							setSelectedIds={setMainPartyIds}
						/>
					</Field>

					<Field>
						<FieldLabel nativeLabel={false} render={<div />}>
							Guests
						</FieldLabel>
						<PartyCombobox
							allowCreate
							ariaLabel="Guests"
							filterOutIds={mainPartyIds}
							placeholder="Search or create guests..."
							selectedIds={guestIds}
							setSelectedIds={setGuestIds}
						/>
					</Field>

					<Field>
						<FieldLabel nativeLabel={false} render={<div />}>
							Linked albums
						</FieldLabel>
						<AlbumCombobox
							ariaLabel="Linked albums"
							selectedIds={linkedAlbumIds}
							setSelectedIds={setLinkedAlbumIds}
						/>
					</Field>
				</section>

				<section className="flex min-w-0 flex-col gap-5">
					<h2 className="text-xl font-semibold tracking-tight">Files</h2>

					<UploadDropZone
						accept={CONCERT_FILE_ACCEPT}
						description="MKV, MOV, MP4, or WebM. Drag the added files to set their order."
						isProcessing={isProcessing}
						onDrop={handleDrop}
						rejectDescription="Only MKV, MOV, MP4, or WebM video files are supported."
						title="Drop video files or browse"
					/>

					{files.length > 0 && (
						<div className="-mx-3">
							<DragDropProvider
								onDragEnd={(event) => {
									if (event.canceled) return;
									setFiles(move(files, event));
								}}
							>
								<div className="flex flex-col">
									{files.map((file, index) => (
										<ConcertFileRow
											disabled={isUploading}
											file={file}
											index={index}
											key={file.id}
											onRemove={removeFileDraft}
											onUpdate={updateFileDraft}
										/>
									))}
								</div>
							</DragDropProvider>
						</div>
					)}
				</section>
			</div>
		</section>
	);
}
