import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	PinIcon,
	PinOffIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Alert, AlertDescription } from "#/components/base/alert";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { Field, FieldLabel } from "#/components/base/field";
import { Input } from "#/components/base/input";
import { toastManager } from "#/components/base/toast";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/base/tooltip";
import { FilterSelect } from "#/components/library/FilterSelect";
import {
	ConfirmDialog,
	useDialogSubject,
} from "#/components/settings/SettingsSection";
import {
	AUDIO_FILE_ACCEPT,
	DEFAULT_TRACK_AUDIO_SOURCE,
} from "#/constant/album";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type {
	AddTrackAudioRequest,
	AlbumEditDetails,
	AlbumEditTrackAudio,
} from "#/lib/queries/albumEdit.queries";
import { formatFileSize } from "#/lib/utils/file";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import {
	createTrackAudioRequest,
	processDroppedFiles,
} from "#/lib/utils/upload";
import { useUploadStore } from "#/store/uploadStore";

type PendingAudio = {
	file: File;
	request: AddTrackAudioRequest;
};

const ACCEPT = Object.entries(AUDIO_FILE_ACCEPT)
	.flatMap(([mimeType, extensions]) => [mimeType, ...extensions])
	.join(",");

function describeAudio(audio: AlbumEditTrackAudio) {
	const sampleRate = audio.audioSampleRate
		? `${Number(audio.audioSampleRate) / 1000} kHz`
		: null;
	const bitDepth = audio.bitsPerSample ? `${audio.bitsPerSample}-bit` : null;
	const bitrate =
		!audio.lossless && audio.bitrate
			? `${Math.round(Number(audio.bitrate) / 1000)} kbps`
			: null;
	const channels =
		audio.audioChannels == null
			? null
			: Number(audio.audioChannels) === 1
				? "Mono"
				: Number(audio.audioChannels) === 2
					? "Stereo"
					: `${audio.audioChannels} ch`;

	return [
		(audio.codec || audio.container)?.toUpperCase(),
		sampleRate,
		bitDepth,
		bitrate,
		channels,
		audio.durationInMs == null
			? null
			: formatMsToMMSSOrHMMSS(Number(audio.durationInMs)),
		audio.sizeInBytes == null ? null : formatFileSize(audio.sizeInBytes),
		audio.source === "Unknown" ? null : audio.source,
	]
		.filter(Boolean)
		.join(" · ");
}

function processingLabel(status: AlbumEditTrackAudio["processingStatus"]) {
	if (status === "Completed") return null;
	if (status === "Pending") return "Waiting for upload";
	if (status === "Failed") return "Processing failed";
	return "Processing";
}

export function TrackAudiosDialog({
	album,
	trackId,
	onClose,
}: {
	album: AlbumEditDetails;
	trackId: number;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const inputId = useId();
	const sourceUrlId = useId();
	const removing = useDialogSubject<AlbumEditTrackAudio>();
	const track = album.discs
		.flatMap((disc) => disc.tracks)
		.find((item) => Number(item.trackId) === trackId);
	const audios = track?.audios ?? [];

	const initialOrder = audios.map((audio) => Number(audio.trackAudioId));
	const initialPinned =
		audios.find((audio) => audio.pinned)?.trackAudioId ?? null;
	const [order, setOrder] = useState(initialOrder);
	const [pinnedId, setPinnedId] = useState<number | null>(
		initialPinned == null ? null : Number(initialPinned),
	);
	const [pending, setPending] = useState<PendingAudio | null>(null);
	const [isPreparing, setIsPreparing] = useState(false);
	const [prepareError, setPrepareError] = useState<string | null>(null);

	const audiosById = new Map(
		audios.map((audio) => [Number(audio.trackAudioId), audio]),
	);
	// Keep local order in sync when audios are added or removed
	const orderedIds = [
		...order.filter((id) => audiosById.has(id)),
		...initialOrder.filter((id) => !order.includes(id)),
	];
	const isOrderDirty =
		JSON.stringify(orderedIds) !== JSON.stringify(initialOrder) ||
		pinnedId !== (initialPinned == null ? null : Number(initialPinned));

	const reorderMutation = useMutation({
		mutationFn: () =>
			albumEditActions.updateTrackAudios(album.albumId, trackId, {
				trackAudioIds: orderedIds,
				pinnedTrackAudioId: pinnedId,
			}),
		onSuccess: (updated) => {
			applyAlbumEdit(queryClient, album.albumId, updated);
			toastManager.add({ title: "Audio order saved", type: "success" });
		},
	});

	const removeMutation = useMutation({
		mutationFn: (audio: AlbumEditTrackAudio) =>
			albumEditActions.removeTrackAudio(
				album.albumId,
				trackId,
				audio.trackAudioId,
			),
		onSuccess: (updated, audio) => {
			applyAlbumEdit(queryClient, album.albumId, updated);
			const removedId = Number(audio.trackAudioId);
			setOrder((current) => current.filter((id) => id !== removedId));
			if (pinnedId === removedId) setPinnedId(null);
			removing.close();
			toastManager.add({ title: "Audio version removed", type: "success" });
		},
	});

	const addMutation = useMutation({
		mutationFn: async ({ file, request }: PendingAudio) => {
			const result = await albumEditActions.addTrackAudio(
				album.albumId,
				trackId,
				request,
			);
			const uploadStore = useUploadStore.getState();
			uploadStore.addFile(file, result.upload.blake3Hash);
			uploadStore.startUpload([result.upload]);
			return result;
		},
		onSuccess: (result) => {
			applyAlbumEdit(queryClient, album.albumId, result.album);
			setPending(null);
			toastManager.add({
				title: "Audio version added",
				description: "The file uploads in the background.",
				type: "success",
			});
		},
	});

	async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setPrepareError(null);
		setIsPreparing(true);
		try {
			const { processedFiles } = await processDroppedFiles([file], 1);
			const fileData = processedFiles.at(0);
			if (!fileData) {
				setPrepareError(`Could not read ${file.name}.`);
				return;
			}
			const durationInMs = Math.round(
				(fileData.metadata.format.duration ?? 0) * 1000,
			);
			const {
				file: fileRequest,
				source,
				sourceUrl,
			} = createTrackAudioRequest(fileData, durationInMs);
			setPending({ file, request: { file: fileRequest, source, sourceUrl } });
		} finally {
			setIsPreparing(false);
		}
	}

	function moveAudio(index: number, offset: number) {
		const next = [...orderedIds];
		const [moved] = next.splice(index, 1);
		next.splice(index + offset, 0, moved);
		setOrder(next);
	}

	const pendingDuration = Number(pending?.request.file.durationInMs ?? 0);
	const isBusy =
		reorderMutation.isPending ||
		removeMutation.isPending ||
		addMutation.isPending;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !isBusy) onClose();
			}}
		>
			<DialogPopup className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Audio versions</DialogTitle>
					<DialogDescription className="[overflow-wrap:anywhere]">
						{track?.title}. The pinned version plays first, then the list order.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel>
					<div className="flex flex-col gap-6">
						<ol className="-mx-2 flex flex-col">
							{orderedIds.map((id, index) => {
								const audio = audiosById.get(id);
								if (!audio) return null;
								const isPinned = pinnedId === id;
								const status = processingLabel(audio.processingStatus);

								return (
									<li
										className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-accent/60"
										key={id}
									>
										<div className="flex min-w-0 flex-1 flex-col gap-0.5">
											<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
												<span
													className="min-w-0 truncate text-sm font-medium"
													title={audio.fileName}
												>
													{audio.fileName}
												</span>
												{isPinned && (
													<Badge size="sm" variant="default">
														<PinIcon aria-hidden="true" />
														Pinned
													</Badge>
												)}
												{audio.lossless && (
													<Badge size="sm" variant="secondary">
														Lossless
													</Badge>
												)}
												{status && (
													<Badge
														size="sm"
														variant={
															audio.processingStatus === "Failed"
																? "error"
																: "warning"
														}
													>
														{status}
													</Badge>
												)}
											</div>
											<p className="text-xs [overflow-wrap:anywhere] text-muted-foreground">
												{describeAudio(audio)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-0.5">
											<Button
												aria-label={`Move ${audio.fileName} up`}
												disabled={isBusy || index === 0}
												onClick={() => moveAudio(index, -1)}
												size="icon-sm"
												variant="ghost"
											>
												<ArrowUpIcon aria-hidden="true" />
											</Button>
											<Button
												aria-label={`Move ${audio.fileName} down`}
												disabled={isBusy || index === orderedIds.length - 1}
												onClick={() => moveAudio(index, 1)}
												size="icon-sm"
												variant="ghost"
											>
												<ArrowDownIcon aria-hidden="true" />
											</Button>
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															aria-label={
																isPinned
																	? `Unpin ${audio.fileName}`
																	: `Pin ${audio.fileName}`
															}
															aria-pressed={isPinned}
															disabled={isBusy}
															onClick={() => setPinnedId(isPinned ? null : id)}
															size="icon-sm"
															variant="ghost"
														/>
													}
												>
													{isPinned ? (
														<PinOffIcon aria-hidden="true" />
													) : (
														<PinIcon aria-hidden="true" />
													)}
												</TooltipTrigger>
												<TooltipPopup>
													{isPinned ? "Unpin" : "Pin, always play first"}
												</TooltipPopup>
											</Tooltip>
											<Tooltip>
												<TooltipTrigger
													render={
														<Button
															aria-label={`Remove ${audio.fileName}`}
															disabled={isBusy || orderedIds.length <= 1}
															onClick={() => removing.show(audio)}
															size="icon-sm"
															variant="ghost"
														/>
													}
												>
													<Trash2Icon aria-hidden="true" />
												</TooltipTrigger>
												<TooltipPopup>
													{orderedIds.length <= 1
														? "A track needs at least one version"
														: "Remove version"}
												</TooltipPopup>
											</Tooltip>
										</div>
									</li>
								);
							})}
						</ol>

						{reorderMutation.error && (
							<Alert variant="error">
								<AlertDescription>
									{reorderMutation.error.message}
								</AlertDescription>
							</Alert>
						)}

						{isOrderDirty && (
							<div className="flex justify-end gap-2">
								<Button
									disabled={isBusy}
									onClick={() => {
										setOrder(initialOrder);
										setPinnedId(
											initialPinned == null ? null : Number(initialPinned),
										);
									}}
									size="sm"
									variant="ghost"
								>
									Reset
								</Button>
								<Button
									disabled={isBusy}
									onClick={() => reorderMutation.mutate()}
									size="sm"
								>
									{reorderMutation.isPending ? "Saving…" : "Save order"}
								</Button>
							</div>
						)}

						<section className="flex flex-col gap-3">
							<h3 className="text-sm font-semibold">Add a version</h3>
							<input
								accept={ACCEPT}
								className="sr-only"
								id={inputId}
								onChange={(event) => void handleFileChange(event)}
								type="file"
							/>
							{pending ? (
								<div className="flex flex-col gap-3">
									<p className="text-sm [overflow-wrap:anywhere]">
										{pending.file.name}
										<span className="text-muted-foreground">
											{" · "}
											{formatMsToMMSSOrHMMSS(pendingDuration)}
											{" · "}
											{formatFileSize(pending.file.size)}
										</span>
									</p>
									<div className="grid gap-4 sm:grid-cols-2">
										<FilterSelect
											label="Source"
											onValueChange={(source) =>
												setPending({
													...pending,
													request: { ...pending.request, source },
												})
											}
											options={MEDIA_SOURCE_OPTIONS}
											value={
												pending.request.source ?? DEFAULT_TRACK_AUDIO_SOURCE
											}
										/>
										<Field>
											<FieldLabel htmlFor={sourceUrlId}>Source URL</FieldLabel>
											<Input
												id={sourceUrlId}
												onChange={(event) =>
													setPending({
														...pending,
														request: {
															...pending.request,
															sourceUrl: event.target.value || null,
														},
													})
												}
												placeholder="Optional"
												type="url"
												value={pending.request.sourceUrl ?? ""}
											/>
										</Field>
									</div>
									{addMutation.error && (
										<Alert variant="error">
											<AlertDescription>
												{addMutation.error.message}
											</AlertDescription>
										</Alert>
									)}
									<div className="flex justify-end gap-2">
										<Button
											disabled={addMutation.isPending}
											onClick={() => {
												setPending(null);
												addMutation.reset();
											}}
											size="sm"
											variant="ghost"
										>
											Cancel
										</Button>
										<Button
											disabled={isBusy}
											onClick={() => addMutation.mutate(pending)}
											size="sm"
										>
											{addMutation.isPending ? "Adding…" : "Add version"}
										</Button>
									</div>
								</div>
							) : (
								<div className="flex flex-col items-start gap-2">
									<Button
										disabled={isBusy}
										loading={isPreparing}
										render={<label htmlFor={inputId} />}
										size="sm"
										variant="outline"
									>
										<PlusIcon aria-hidden="true" />
										Choose audio file
									</Button>
									<p className="text-xs text-muted-foreground">
										Another file of the same recording, for example a lossless
										copy. FLAC, MP3, WAV, or DSF.
									</p>
									{prepareError && (
										<Alert variant="error">
											<AlertDescription>{prepareError}</AlertDescription>
										</Alert>
									)}
								</div>
							)}
						</section>
					</div>
				</DialogPanel>
				<DialogFooter>
					<DialogClose disabled={isBusy} render={<Button variant="ghost" />}>
						Close
					</DialogClose>
				</DialogFooter>
			</DialogPopup>

			<ConfirmDialog
				confirmLabel="Remove"
				description={
					<>
						Remove “{removing.subject?.fileName}” from this track? The file
						stays in the library.
					</>
				}
				mutation={removeMutation}
				onConfirm={() => {
					if (removing.subject) removeMutation.mutate(removing.subject);
				}}
				onOpenChange={(open) => {
					if (!open) removing.close();
				}}
				onOpenChangeComplete={removing.onOpenChangeComplete}
				open={removing.open}
				pendingLabel="Removing…"
				title="Remove audio version"
			/>
		</Dialog>
	);
}
