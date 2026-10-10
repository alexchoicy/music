import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { toastManager } from "#/components/coss/toast";
import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { ImageCropDialog } from "#/components/imageCropDialog";
import { ALBUM_COVER_ASPECT_RATIO, COVER_IMAGE_ACCEPT } from "#/constant/album";
import { completeUpload } from "#/lib/api/uploads";
import {
	albumEditActions,
	applyAlbumEdit,
} from "#/lib/queries/albumEdit.queries";
import type {
	AlbumEditCover,
	AlbumEditDetails,
	UpdateAlbumCoverRequest,
} from "#/lib/queries/albumEdit.queries";
import { createCoverAsset } from "#/lib/utils/upload";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type CropTarget =
	| { kind: "new"; file: File; src: string }
	| { kind: "existing"; src: string };

function CoverPreview({
	cover,
	label,
}: {
	cover: AlbumEditCover | null | undefined;
	label: string;
}) {
	const isReady = cover?.processingStatus === "Completed";
	const processed = cover?.variants.imageCover1024x1024;
	const original = cover?.variants.original;

	// The processed variant is already cropped, until then crop the original on screen
	if (isReady && processed) {
		return (
			<img
				alt={label}
				className="size-40 rounded-xl border object-cover"
				src={processed.url}
			/>
		);
	}

	return (
		<CroppedImagePreview
			alt={label}
			className="size-40"
			croppedArea={
				cover?.croppedArea
					? {
							x: Number(cover.croppedArea.x),
							y: Number(cover.croppedArea.y),
							width: Number(cover.croppedArea.width),
							height: Number(cover.croppedArea.height),
						}
					: undefined
			}
			fallback={<ImageIcon aria-hidden="true" className="size-8" />}
			height={Number(original?.height ?? 1)}
			src={original?.url}
			width={Number(original?.width ?? 1)}
		/>
	);
}

function CoverSlot({
	albumId,
	albumDiscId,
	cover,
	hasAlbumCover,
	label,
}: {
	albumId: number;
	albumDiscId: number | null;
	cover: AlbumEditCover | null | undefined;
	hasAlbumCover: boolean;
	label: string;
}) {
	const inputId = useId();
	const queryClient = useQueryClient();
	const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
	const [isCropOpen, setIsCropOpen] = useState(false);
	const isDisc = albumDiscId !== null;

	const mutation = useMutation({
		mutationFn: async ({
			request,
			file,
		}: {
			request: Omit<UpdateAlbumCoverRequest, "albumDiscId">;
			file?: File;
		}) => {
			const result = await albumEditActions.updateCover(albumId, {
				...request,
				albumDiscId,
			});

			if (result.upload && file) {
				const response = await fetch(result.upload.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": file.type },
					body: file,
				});
				if (!response.ok) {
					throw new Error(`Cover upload failed: ${response.status}`);
				}
				await completeUpload({ fileObjectId: result.upload.fileObjectId });
			}

			return result;
		},
		onSuccess: (result) => {
			applyAlbumEdit(queryClient, albumId, result.album);
			// The upload above changed processing state after the response was built
			void queryClient.invalidateQueries({
				queryKey: ["albums", String(albumId), "edit"],
			});
			toastManager.add({ title: `${label} updated`, type: "success" });
		},
		onError: (error) => {
			toastManager.add({
				title: `Could not update ${label.toLowerCase()}`,
				description: error.message,
				type: "error",
			});
		},
	});

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setCropTarget({ kind: "new", file, src: URL.createObjectURL(file) });
		setIsCropOpen(true);
	}

	async function handleCropConfirm(croppedArea: CroppedArea) {
		if (!cropTarget) return;
		setIsCropOpen(false);

		if (cropTarget.kind === "new") {
			const asset = await createCoverAsset(
				cropTarget.file,
				cropTarget.file.name,
				croppedArea,
			);
			if (!asset) return;
			mutation.mutate({
				request: { image: asset.imageRequest },
				file: cropTarget.file,
			});
		} else {
			mutation.mutate({ request: { croppedArea } });
		}
	}

	const originalUrl = cover?.variants.original?.url;
	const statusLabel =
		cover && cover.processingStatus !== "Completed"
			? cover.processingStatus === "Pending"
				? "Waiting for upload"
				: "Processing"
			: null;

	return (
		<div
			className="flex flex-col gap-4 sm:flex-row sm:items-center"
			data-testid={isDisc ? `disc-cover-${albumDiscId}` : "album-cover"}
		>
			<CoverPreview cover={cover} label={label} />

			<div className="grid gap-2">
				<div className="flex items-center gap-2">
					<span className="font-medium">{label}</span>
					{statusLabel && (
						<Badge size="sm" variant="warning">
							{statusLabel}
						</Badge>
					)}
				</div>
				{isDisc && !cover && (
					<p className="text-sm text-muted-foreground">
						No own cover, the album cover is shown.
					</p>
				)}

				<input
					accept={COVER_IMAGE_ACCEPT}
					className="sr-only"
					id={inputId}
					onChange={handleFileChange}
					type="file"
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={mutation.isPending}
						render={<label htmlFor={inputId} />}
						size="sm"
					>
						{cover ? "Replace image" : "Upload image"}
					</Button>
					{cover && originalUrl && (
						<Button
							disabled={mutation.isPending}
							onClick={() => {
								setCropTarget({ kind: "existing", src: originalUrl });
								setIsCropOpen(true);
							}}
							size="sm"
							variant="outline"
						>
							Adjust crop
						</Button>
					)}
					{isDisc && hasAlbumCover && (
						<Button
							disabled={mutation.isPending}
							onClick={() =>
								mutation.mutate({ request: { useAlbumCover: true } })
							}
							size="sm"
							variant="outline"
						>
							Use album cover
						</Button>
					)}
					{isDisc && cover && (
						<Button
							disabled={mutation.isPending}
							onClick={() => mutation.mutate({ request: { remove: true } })}
							size="sm"
							variant="destructive-outline"
						>
							Remove
						</Button>
					)}
				</div>
				{mutation.isPending && (
					<span className="text-sm text-muted-foreground" role="status">
						Saving…
					</span>
				)}
			</div>

			<ImageCropDialog
				aspectRatio={ALBUM_COVER_ASPECT_RATIO}
				confirmLabel="Use crop"
				description="Choose the square area used as the cover."
				imageAlt={label}
				imageSrc={cropTarget?.src ?? null}
				initialCroppedArea={
					cropTarget?.kind === "existing" && cover?.croppedArea
						? {
								x: Number(cover.croppedArea.x),
								y: Number(cover.croppedArea.y),
								width: Number(cover.croppedArea.width),
								height: Number(cover.croppedArea.height),
							}
						: null
				}
				onConfirm={handleCropConfirm}
				onOpenChange={setIsCropOpen}
				onOpenChangeComplete={(open) => {
					if (open || !cropTarget) return;
					if (cropTarget.kind === "new") URL.revokeObjectURL(cropTarget.src);
					setCropTarget(null);
				}}
				open={isCropOpen}
				title={`Crop ${label.toLowerCase()}`}
			/>
		</div>
	);
}

export function AlbumCoverTab({ album }: { album: AlbumEditDetails }) {
	const albumId = Number(album.albumId);

	return (
		<div className="grid max-w-3xl gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Album cover</CardTitle>
				</CardHeader>
				<CardPanel>
					<CoverSlot
						albumDiscId={null}
						albumId={albumId}
						cover={album.cover}
						hasAlbumCover={Boolean(album.cover)}
						label="Album cover"
					/>
				</CardPanel>
			</Card>

			{album.discs.length > 1 && (
				<Card>
					<CardHeader>
						<CardTitle>Disc covers</CardTitle>
					</CardHeader>
					<CardPanel>
						<div className="grid gap-6">
							{album.discs.map((disc) => (
								<CoverSlot
									albumDiscId={Number(disc.albumDiscId)}
									albumId={albumId}
									cover={disc.cover}
									hasAlbumCover={Boolean(album.cover)}
									key={disc.albumDiscId}
									label={`Disc ${disc.discNumber} cover`}
								/>
							))}
						</div>
					</CardPanel>
				</Card>
			)}
		</div>
	);
}
