import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { UploadIcon } from "lucide-react";
import { useId } from "react";
import type { Accept } from "react-dropzone";

import { Button } from "#/components/coss/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "#/components/coss/card";
import { Field, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { Textarea } from "#/components/coss/textarea";
import { toastManager } from "#/components/coss/toast";
import { ConcertFileDraftItem } from "#/components/create/concert/concertFileDraftItem";
import { ConcertImageField } from "#/components/create/concert/concertImageField";
import { DropBox } from "#/components/dropBox";
import { LinkedAlbumsCombobox } from "#/components/linkedAlbumsCombobox";
import { PartyCombobox } from "#/components/PartyCombobox";
import { ReleaseDateField } from "#/components/ReleaseDateField";
import { useConcertUploadStore } from "#/store/concertUploadStore";

const concertFileAccept: Accept = {
	"video/*": [".mkv", ".mov", ".mp4", ".webm"],
	"video/x-matroska": [".mkv"],
};

export function ConcertTabContent() {
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
	const isSubmitting = submitStatus === "uploading";
	const isSubmitDisabled =
		!title.trim() ||
		isProcessing ||
		isSubmitting ||
		submitStatus === "completed";

	async function handleFileDrop(acceptedFiles: File[]) {
		const result = await addDroppedFiles(acceptedFiles);

		if (result.processedFileNames.length > 0) {
			toastManager.add({
				title: `${result.processedFileNames.length} Files processed successfully`,
				type: "success",
			});
		}

		if (result.ignoredFileNames.length > 0) {
			toastManager.add({
				title: "Some files could not be processed",
				description: result.ignoredFileNames.join(", "),
				type: "error",
			});
		}
	}

	async function handleSubmit() {
		try {
			await submitConcert();
			toastManager.add({
				title: "Concert upload started",
				type: "success",
			});
		} catch (error) {
			toastManager.add({
				title: "Concert upload failed",
				description:
					error instanceof Error ? error.message : "Unable to upload concert",
				type: "error",
			});
		}
	}

	return (
		<section className="flex flex-col gap-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<h1 className="text-xl font-semibold tracking-tight">Concert</h1>
					<p className="text-sm text-muted-foreground">
						Create a concert draft with details and ordered files.
					</p>
				</div>
				<Button
					disabled={isSubmitDisabled}
					loading={isSubmitting || isProcessing}
					onClick={handleSubmit}
				>
					<UploadIcon aria-hidden="true" />
					{submitStatus === "uploading"
						? "Uploading..."
						: submitStatus === "completed"
							? "Submitted"
							: "Submit"}
				</Button>
			</div>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
				<Card className="overflow-hidden">
					<CardHeader className="border-b p-4 sm:p-5">
						<CardTitle>Concert details</CardTitle>
						<CardDescription>
							Basic metadata, parties, and linked albums.
						</CardDescription>
					</CardHeader>

					<CardPanel className="grid gap-5 p-4 sm:p-5">
						<ConcertImageField />

						<Field name="concert-title">
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

						<Field name="concert-description">
							<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
							<Textarea
								id={descriptionId}
								onChange={(event) => setDescription(event.target.value)}
								value={description}
							/>
						</Field>

						<Field name="concert-main-parties">
							<FieldLabel>Main Parties</FieldLabel>
							<PartyCombobox
								allowCreate
								ariaLabel="Main parties"
								filterOutIds={guestIds}
								placeholder="Search or create main parties..."
								selectedIds={mainPartyIds}
								setSelectedIds={setMainPartyIds}
							/>
						</Field>

						<Field name="concert-guests">
							<FieldLabel>Guests</FieldLabel>
							<PartyCombobox
								allowCreate
								ariaLabel="Guests"
								filterOutIds={mainPartyIds}
								placeholder="Search or create guests..."
								selectedIds={guestIds}
								setSelectedIds={setGuestIds}
							/>
						</Field>

						<Field name="linked-albums">
							<FieldLabel>Linked Albums</FieldLabel>
							<LinkedAlbumsCombobox
								selectedIds={linkedAlbumIds}
								setSelectedIds={setLinkedAlbumIds}
							/>
						</Field>
					</CardPanel>
				</Card>

				<Card className="overflow-hidden">
					<CardHeader className="border-b p-4 sm:p-5">
						<CardTitle>Concert files</CardTitle>
						<CardDescription>
							Drop concert videos, then drag to sort the upload order.
						</CardDescription>
					</CardHeader>

					<CardPanel className="grid gap-4 p-4 sm:p-5">
						<DropBox
							accept={concertFileAccept}
							activeHint="Drop the concert files here."
							errorHint="Only MKV, MOV, MP4, or WebM files are supported."
							hint="Drag and drop MKV, MOV, MP4, or WebM files here, or browse from your device."
							isProcessing={isProcessing}
							onDrop={handleFileDrop}
							title="Choose concert files"
						/>

						{files.length > 0 && (
							<div className="overflow-hidden rounded-xl border bg-background">
								<div className="hidden grid-cols-[2rem_minmax(0,1fr)_12rem_2rem] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
									<span aria-hidden="true" />
									<span>File title</span>
									<span>Type</span>
									<span aria-hidden="true" />
								</div>
								<DragDropProvider
									onDragEnd={(event) => {
										if (event.canceled) return;
										setFiles(move(files, event));
									}}
								>
									<div className="divide-y">
										{files.map((file, index) => (
											<ConcertFileDraftItem
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
					</CardPanel>
				</Card>
			</div>
		</section>
	);
}
