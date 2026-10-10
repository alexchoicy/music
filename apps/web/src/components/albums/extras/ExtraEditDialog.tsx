import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import pMap from "p-map";
import { useEffect, useId, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Alert, AlertDescription } from "#/components/coss/alert";
import { Button } from "#/components/coss/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import { Field, FieldLabel } from "#/components/coss/field";
import { Input } from "#/components/coss/input";
import { Textarea } from "#/components/coss/textarea";
import { toastManager } from "#/components/coss/toast";
import { EnumFieldSelect } from "#/components/enumFieldSelect";
import { ImageCropDialog } from "#/components/imageCropDialog";
import type { components } from "#/data/APIschema";
import { MEDIA_SOURCE_OPTIONS } from "#/enums/albumEnums";
import { EXTRA_CATEGORY_OPTIONS } from "#/enums/extraEnums";
import { extraActions, extraQueries } from "#/lib/queries/extra.queries";
import type {
	ExtraDetails,
	SaveExtraRequest,
} from "#/lib/queries/extra.queries";
import { prepareExtraFile, uploadExtraFiles } from "#/lib/upload/extraUpload";
import { cn } from "#/lib/utils/styles";
import type { CroppedArea } from "#/store/albumUploadStoreType";

import { ExtraAssetRow } from "./ExtraAssetRow";
import type { ExtraAssetDraft } from "./ExtraAssetRow";
import { ExtraCover } from "./ExtraCover";
import { getAssetStatusLabel, getAssetThumbnailUrl } from "./extraUtils";

type ExtraCategory = components["schemas"]["ExtraCategory"];
type MediaSource = components["schemas"]["MediaSource"];

type ExtraEditDialogProps = {
	albumId: number;
	extra?: ExtraDetails;
	onClose: () => void;
};

function toDraft(asset: NonNullable<ExtraDetails["assets"]>[number]) {
	const isImage = asset.fileType === "Image";

	return {
		id: asset.assetId,
		assetId: asset.assetId,
		title: asset.title ?? "",
		fileName: asset.originalFileName,
		fileType: asset.fileType,
		sizeInBytes: asset.original ? Number(asset.original.sizeInBytes) : null,
		thumbnailUrl: getAssetThumbnailUrl(asset) ?? null,
		// Crop on the preview, originals can be 100+ MB
		cropSourceUrl: isImage
			? (asset.preview?.url ?? asset.original?.url ?? null)
			: null,
		cropScale:
			asset.preview?.width && asset.original?.width
				? Number(asset.original.width) / Number(asset.preview.width)
				: 1,
		width: asset.original?.width ? Number(asset.original.width) : null,
		height: asset.original?.height ? Number(asset.original.height) : null,
		openUrl: !isImage && asset.original ? `${asset.original.url}/play` : null,
		statusLabel: getAssetStatusLabel(asset),
		prepared: null,
	} satisfies ExtraAssetDraft;
}

function toCroppedArea(
	area: ExtraDetails["coverCroppedArea"],
): CroppedArea | null {
	if (!area) return null;
	return {
		x: Number(area.x),
		y: Number(area.y),
		width: Number(area.width),
		height: Number(area.height),
	};
}

function getInitialCoverId(extra: ExtraDetails | undefined) {
	if (!extra) return null;
	return (
		extra.coverAssetId ??
		extra.assets?.find((asset) => asset.fileType === "Image")?.assetId ??
		null
	);
}

export function ExtraEditDialog({
	albumId,
	extra,
	onClose,
}: ExtraEditDialogProps) {
	const titleId = useId();
	const descriptionId = useId();
	const queryClient = useQueryClient();
	const isEditing = Boolean(extra);

	const [title, setTitle] = useState(extra?.title ?? "");
	const [description, setDescription] = useState(extra?.description ?? "");
	const [category, setCategory] = useState<ExtraCategory>(
		extra?.category ?? "Booklet",
	);
	const [source, setSource] = useState<MediaSource>(extra?.source ?? "CD");
	const [assets, setAssets] = useState<ExtraAssetDraft[]>(() =>
		(extra?.assets ?? []).map(toDraft),
	);
	const [coverId, setCoverId] = useState<string | null>(() =>
		getInitialCoverId(extra),
	);
	const [coverCrop, setCoverCrop] = useState<CroppedArea | null>(() =>
		extra?.coverAssetId ? toCroppedArea(extra.coverCroppedArea) : null,
	);
	const [cropTargetId, setCropTargetId] = useState<string | null>(null);
	const [isPreparing, setIsPreparing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const objectUrls = useRef<string[]>([]);

	useEffect(() => {
		const urls = objectUrls.current;
		return () => {
			for (const url of urls) URL.revokeObjectURL(url);
		};
	}, []);

	const coverAsset = assets.find((asset) => asset.id === coverId) ?? null;
	const cropTarget = assets.find((asset) => asset.id === cropTargetId) ?? null;

	const saveMutation = useMutation({
		mutationFn: async () => {
			const request: SaveExtraRequest = {
				title: title.trim(),
				description,
				category,
				source,
				assets: assets.map((asset) => ({
					assetId: asset.assetId,
					file: asset.assetId ? null : asset.prepared!.fileRequest,
					title: asset.title.trim() || null,
				})),
				coverAssetIndex: coverAsset ? assets.indexOf(coverAsset) : null,
				coverCroppedArea: coverAsset ? coverCrop : null,
				version: extra?.version ?? null,
			};

			const result = extra
				? await extraActions.update(extra.extraId, request)
				: await extraActions.createForAlbum(albumId, request);

			const filesByHash = new Map(
				assets
					.filter((asset) => asset.prepared)
					.map((asset) => [asset.prepared!.blake3Hash, asset.prepared!.file]),
			);

			const { backgroundUploadCount } = await uploadExtraFiles(
				result.uploads ?? [],
				filesByHash,
				(done, total) => setUploadProgress(`Uploading images ${done}/${total}`),
			);

			return { result, backgroundUploadCount };
		},
		onSuccess: ({ result, backgroundUploadCount }) => {
			toastManager.add({
				title: isEditing ? "Extra saved" : "Extra created",
				description:
					backgroundUploadCount > 0
						? `${result.extra.title} saved. ${backgroundUploadCount} file(s) are uploading in the background.`
						: `${result.extra.title} saved.`,
				type: "success",
			});
			onClose();
		},
		onSettled: () => {
			setUploadProgress(null);
			void queryClient.invalidateQueries({
				queryKey: extraQueries.getAlbumExtras(albumId).queryKey,
			});
		},
	});

	const deleteMutation = useMutation({
		mutationFn: () => extraActions.delete(extra!.extraId),
		onSuccess: () => {
			toastManager.add({
				title: "Extra deleted",
				description: `${extra!.title} was deleted.`,
			});
			onClose();
		},
		onSettled: () =>
			queryClient.invalidateQueries({
				queryKey: extraQueries.getAlbumExtras(albumId).queryKey,
			}),
	});

	const isBusy =
		isPreparing || saveMutation.isPending || deleteMutation.isPending;

	async function handleDrop(files: File[]) {
		if (files.length === 0) return;
		setIsPreparing(true);

		try {
			const prepared = await pMap(files, prepareExtraFile, { concurrency: 2 });
			const knownHashes = new Set(
				assets.flatMap((asset) =>
					asset.prepared ? [asset.prepared.blake3Hash] : [],
				),
			);
			const skipped: string[] = [];
			const drafts: ExtraAssetDraft[] = [];

			for (const item of prepared) {
				if (knownHashes.has(item.blake3Hash)) {
					skipped.push(item.file.name);
					continue;
				}
				knownHashes.add(item.blake3Hash);

				const localUrl = item.isImage ? URL.createObjectURL(item.file) : null;
				const thumbnailUrl = item.thumbnail
					? URL.createObjectURL(item.thumbnail)
					: localUrl;
				for (const url of [localUrl, thumbnailUrl]) {
					if (url) objectUrls.current.push(url);
				}

				drafts.push({
					id: crypto.randomUUID(),
					assetId: null,
					title: "",
					fileName: item.file.name,
					fileType: item.isImage
						? "Image"
						: item.fileRequest.mimeType.startsWith("audio/")
							? "Audio"
							: item.fileRequest.mimeType.startsWith("video/")
								? "Video"
								: "Document",
					sizeInBytes: item.file.size,
					thumbnailUrl,
					cropSourceUrl: localUrl,
					cropScale: 1,
					width: item.width,
					height: item.height,
					openUrl: null,
					statusLabel: null,
					prepared: item,
				});
			}

			setAssets((current) => [...current, ...drafts]);
			if (!coverId) {
				const firstImage = drafts.find((draft) => draft.fileType === "Image");
				if (firstImage) setCoverId(firstImage.id);
			}

			if (skipped.length > 0) {
				toastManager.add({
					title: "Duplicate files skipped",
					description: skipped.join(", "),
					type: "warning",
				});
			}
		} catch (error) {
			toastManager.add({
				title: "Could not read files",
				description:
					error instanceof Error ? error.message : "Something went wrong.",
				type: "error",
			});
		} finally {
			setIsPreparing(false);
		}
	}

	const { getInputProps, getRootProps, isDragActive } = useDropzone({
		disabled: isBusy,
		multiple: true,
		onDrop: (files) => void handleDrop(files),
	});

	function handleRemove(id: string) {
		const remaining = assets.filter((asset) => asset.id !== id);
		setAssets(remaining);

		if (id === coverId) {
			setCoverId(
				remaining.find((asset) => asset.fileType === "Image")?.id ?? null,
			);
			setCoverCrop(null);
		}
	}

	function handleSetCover(id: string) {
		if (id === coverId) return;
		setCoverId(id);
		setCoverCrop(null);
	}

	function handleTitleChange(id: string, value: string) {
		setAssets((current) =>
			current.map((asset) =>
				asset.id === id ? { ...asset, title: value } : asset,
			),
		);
	}

	const statusText = isPreparing
		? "Reading files…"
		: (uploadProgress ?? (saveMutation.isPending ? "Saving…" : null));
	const error = saveMutation.error ?? deleteMutation.error;

	return (
		<>
			<Dialog
				open
				onOpenChange={(open) => {
					if (!open && !isBusy) onClose();
				}}
			>
				<DialogPopup className="max-w-3xl" showCloseButton={!isBusy}>
					<DialogHeader>
						<DialogTitle>{isEditing ? "Edit extra" : "New extra"}</DialogTitle>
						<DialogDescription>
							Booklet scans, packaging, inserts or bonus files. Files are shown
							in the order below.
						</DialogDescription>
					</DialogHeader>

					<DialogPanel>
						<div className="grid gap-5">
							<div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
								<ExtraCover
									alt="Extra cover"
									className="aspect-square w-32"
									croppedArea={coverCrop ?? undefined}
									height={coverAsset?.height ?? 1}
									src={coverAsset?.thumbnailUrl ?? undefined}
									width={coverAsset?.width ?? 1}
								/>

								<div className="grid gap-3">
									<Field>
										<FieldLabel htmlFor={titleId}>Title</FieldLabel>
										<Input
											disabled={isBusy}
											id={titleId}
											onChange={(event) => setTitle(event.target.value)}
											placeholder="e.g. Limited edition booklet"
											required
											value={title}
										/>
									</Field>
									<div className="grid gap-3 sm:grid-cols-2">
										<EnumFieldSelect
											label="Category"
											onValueChange={setCategory}
											options={EXTRA_CATEGORY_OPTIONS}
											value={category}
										/>
										<EnumFieldSelect
											label="Source"
											onValueChange={setSource}
											options={MEDIA_SOURCE_OPTIONS}
											value={source}
										/>
									</div>
								</div>
							</div>

							<Field>
								<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
								<Textarea
									disabled={isBusy}
									id={descriptionId}
									onChange={(event) => setDescription(event.target.value)}
									placeholder="Optional notes"
									rows={2}
									value={description}
								/>
							</Field>

							<div className="grid gap-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										Files ({assets.length})
									</span>
									<span className="text-xs text-muted-foreground">
										Drag to reorder · ★ sets the cover
									</span>
								</div>

								<div
									{...getRootProps()}
									className={cn(
										"flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40",
										isDragActive && "border-primary bg-primary/5",
										isBusy && "pointer-events-none opacity-50",
									)}
									data-testid="extra-dropzone"
								>
									<input {...getInputProps()} />
									<UploadIcon aria-hidden="true" className="size-5" />
									<span>
										{isPreparing
											? "Reading files…"
											: "Drop scans, audio, video or documents, or click to browse"}
									</span>
								</div>

								{assets.length > 0 && (
									<div className="overflow-hidden rounded-xl border">
										<DragDropProvider
											onDragEnd={(event) => {
												if (event.canceled) return;
												setAssets((current) => move(current, event));
											}}
										>
											<div className="divide-y">
												{assets.map((asset, index) => (
													<ExtraAssetRow
														asset={asset}
														disabled={isBusy}
														index={index}
														isCover={asset.id === coverId}
														key={asset.id}
														onCrop={setCropTargetId}
														onRemove={handleRemove}
														onSetCover={handleSetCover}
														onTitleChange={handleTitleChange}
													/>
												))}
											</div>
										</DragDropProvider>
									</div>
								)}
							</div>

							{error && (
								<Alert variant="error">
									<AlertDescription>{error.message}</AlertDescription>
								</Alert>
							)}
						</div>
					</DialogPanel>

					<DialogFooter className="sm:justify-between">
						<div>
							{isEditing && (
								<Button
									disabled={isBusy}
									onClick={() => {
										if (confirmDelete) deleteMutation.mutate();
										else setConfirmDelete(true);
									}}
									variant={
										confirmDelete ? "destructive" : "destructive-outline"
									}
								>
									{confirmDelete ? "Confirm delete" : "Delete"}
								</Button>
							)}
						</div>
						<div className="flex items-center gap-2">
							{statusText && (
								<span className="text-sm text-muted-foreground" role="status">
									{statusText}
								</span>
							)}
							<Button disabled={isBusy} onClick={onClose} variant="ghost">
								Cancel
							</Button>
							<Button
								disabled={!title.trim() || isBusy}
								onClick={() => saveMutation.mutate()}
							>
								{isEditing ? "Save" : "Create"}
							</Button>
						</div>
					</DialogFooter>
				</DialogPopup>
			</Dialog>

			<ImageCropDialog
				aspectRatio={1}
				confirmLabel="Use crop"
				description="Choose the square crop used as this extra's cover."
				imageAlt="Cover image"
				imageSrc={cropTarget?.cropSourceUrl ?? null}
				// Saved crop is in original pixels, the crop source can be a smaller preview
				initialCroppedArea={
					cropTarget && cropTarget.id === coverId && coverCrop
						? {
								x: coverCrop.x / cropTarget.cropScale,
								y: coverCrop.y / cropTarget.cropScale,
								width: coverCrop.width / cropTarget.cropScale,
								height: coverCrop.height / cropTarget.cropScale,
							}
						: null
				}
				onConfirm={(area) => {
					const scale = cropTarget?.cropScale ?? 1;
					setCoverCrop({
						x: Math.round(area.x * scale),
						y: Math.round(area.y * scale),
						width: Math.round(area.width * scale),
						height: Math.round(area.height * scale),
					});
					setCropTargetId(null);
				}}
				onOpenChange={(open) => {
					if (!open) setCropTargetId(null);
				}}
				open={cropTarget !== null}
				title="Crop cover"
			/>
		</>
	);
}
