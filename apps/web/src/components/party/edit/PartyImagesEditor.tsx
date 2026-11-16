import type * as API from "@music/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { toastManager } from "#/components/base/toast";
import { CroppedImagePreview } from "#/components/image/CroppedImagePreview";
import { ImageCropDialog } from "#/components/image/ImageCropDialog";
import { COVER_IMAGE_ACCEPT } from "#/constant/album";
import { completeUpload } from "#/lib/api/uploads";
import {
	invalidatePartyEdit,
	partyEditActions,
} from "#/lib/queries/party.queries";
import { cn } from "#/lib/utils/styles";
import { createCoverAsset } from "#/lib/utils/upload";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type PartyImage = API.PartyImageDetails;
type ImageRole = "Avatar" | "Banner";

type CropTarget =
	| { kind: "new"; file: File; src: string }
	| { kind: "existing"; image: PartyImage; src: string };

const ROLES: {
	role: ImageRole;
	title: string;
	description: string;
	aspectRatio: number;
	previewClassName: string;
}[] = [
	{
		role: "Avatar",
		title: "Avatar",
		description: "Square picture shown on tiles and the party page.",
		aspectRatio: 1,
		previewClassName: "size-28 rounded-full",
	},
	{
		role: "Banner",
		title: "Banner",
		description: "Wide 3:1 picture.",
		aspectRatio: 3,
		previewClassName: "aspect-[3/1] w-60 max-w-full",
	},
];

function toCroppedArea(
	area: PartyImage["croppedArea"],
): CroppedArea | undefined {
	if (!area) return undefined;
	return {
		x: Number(area.x),
		y: Number(area.y),
		width: Number(area.width),
		height: Number(area.height),
	};
}

// Party images come without their size, so the crop is applied once the image has loaded
function PartyImagePreview({
	className,
	image,
	label,
}: {
	className: string;
	image: PartyImage;
	label: string;
}) {
	const [size, setSize] = useState<{ width: number; height: number }>();

	return (
		<>
			{image.url && !size && (
				<img
					alt=""
					className="hidden"
					onLoad={(event) =>
						setSize({
							width: event.currentTarget.naturalWidth,
							height: event.currentTarget.naturalHeight,
						})
					}
					src={image.url}
				/>
			)}
			<CroppedImagePreview
				alt={label}
				className={className}
				croppedArea={size ? toCroppedArea(image.croppedArea) : undefined}
				fallback={<ImageIcon aria-hidden="true" className="size-8" />}
				height={size?.height ?? 1}
				src={image.url ?? undefined}
				width={size?.width ?? 1}
			/>
		</>
	);
}

function RoleSection({
	aspectRatio,
	description,
	images,
	partyId,
	previewClassName,
	role,
	title,
}: (typeof ROLES)[number] & {
	images: PartyImage[];
	partyId: number | string;
}) {
	const inputId = useId();
	const headingId = useId();
	const queryClient = useQueryClient();
	const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
	const [isCropOpen, setIsCropOpen] = useState(false);
	const primary = images.find((image) => image.isPrimary);

	// Only one image per role can be primary, so the current one steps down in the same request
	function demoted(except?: PartyImage): API.UpdatePartyImageRequest[] {
		if (!primary || primary.id === except?.id) return [];
		return [
			{
				id: primary.id,
				imageRole: role,
				isPrimary: false,
				croppedArea: primary.croppedArea ?? null,
			},
		];
	}

	const mutation = useMutation({
		mutationFn: async ({
			file,
			request,
		}: {
			file?: File;
			request: API.PartyImageBatchRequest;
			success: string;
		}) => {
			const result = await partyEditActions.updateImages(partyId, request);
			const upload = result.images?.[0];

			if (upload && file) {
				const response = await fetch(upload.uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": file.type },
					body: file,
				});
				if (!response.ok) {
					throw new Error(`Image upload failed: ${response.status}`);
				}
				await completeUpload({ fileObjectId: upload.fileObjectId });
			}
		},
		onSuccess: (_, { success }) => {
			toastManager.add({ title: success, type: "success" });
		},
		onError: (error) => {
			toastManager.add({
				title: `Could not update ${title.toLowerCase()}`,
				description: error.message,
				type: "error",
			});
		},
		// A failed upload still leaves the new image row behind
		onSettled: () => invalidatePartyEdit(queryClient),
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

		if (cropTarget.kind === "existing") {
			mutation.mutate({
				request: {
					upsert: [
						{
							id: cropTarget.image.id,
							imageRole: role,
							isPrimary: cropTarget.image.isPrimary ?? false,
							croppedArea,
						},
					],
					delete: [],
				},
				success: `${title} crop updated`,
			});
			return;
		}

		const asset = await createCoverAsset(
			cropTarget.file,
			cropTarget.file.name,
			croppedArea,
		);
		if (!asset) return;
		URL.revokeObjectURL(asset.localURL);
		mutation.mutate({
			file: cropTarget.file,
			request: {
				upsert: [
					...demoted(),
					{
						file: asset.imageRequest.file,
						imageRole: role,
						isPrimary: true,
						croppedArea,
					},
				],
				delete: [],
			},
			success: `${title} uploaded`,
		});
	}

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="text-xl font-semibold tracking-tight" id={headingId}>
						{title}
					</h2>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
				<input
					accept={COVER_IMAGE_ACCEPT}
					className="sr-only"
					id={inputId}
					onChange={handleFileChange}
					type="file"
				/>
				<div className="flex items-center gap-3">
					{mutation.isPending && (
						<span className="text-sm text-muted-foreground" role="status">
							Saving…
						</span>
					)}
					<Button
						disabled={mutation.isPending}
						render={<label htmlFor={inputId} />}
					>
						Upload image
					</Button>
				</div>
			</div>

			{images.length > 0 ? (
				<ul className="flex flex-col gap-5">
					{images.map((image, index) => {
						const label = `${title} ${index + 1}`;
						return (
							<li
								className="flex flex-col gap-4 sm:flex-row sm:items-center"
								key={image.id}
							>
								<PartyImagePreview
									className={cn("shrink-0", previewClassName)}
									image={image}
									label={label}
								/>
								<div className="flex flex-col gap-2">
									<div className="flex items-center gap-2">
										<span className="font-medium">{label}</span>
										{image.isPrimary && (
											<Badge size="sm" variant="info">
												In use
											</Badge>
										)}
									</div>
									<div className="flex flex-wrap gap-2">
										{!image.isPrimary && (
											<Button
												disabled={mutation.isPending}
												onClick={() =>
													mutation.mutate({
														request: {
															upsert: [
																...demoted(image),
																{
																	id: image.id,
																	imageRole: role,
																	isPrimary: true,
																	croppedArea: image.croppedArea ?? null,
																},
															],
															delete: [],
														},
														success: `${title} changed`,
													})
												}
												size="sm"
											>
												Use this image
											</Button>
										)}
										{image.url && (
											<Button
												disabled={mutation.isPending}
												onClick={() => {
													setCropTarget({
														kind: "existing",
														image,
														src: image.url!,
													});
													setIsCropOpen(true);
												}}
												size="sm"
												variant="outline"
											>
												Adjust crop
											</Button>
										)}
										<Button
											disabled={mutation.isPending}
											onClick={() =>
												mutation.mutate({
													request: { upsert: [], delete: [image.id] },
													success: `${title} removed`,
												})
											}
											size="sm"
											variant="destructive-outline"
										>
											Remove
										</Button>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">
					No {title.toLowerCase()} yet.
				</p>
			)}

			<ImageCropDialog
				aspectRatio={aspectRatio}
				confirmLabel="Use crop"
				description={`Choose the area used as the ${title.toLowerCase()}.`}
				imageAlt={title}
				imageSrc={cropTarget?.src ?? null}
				initialCroppedArea={
					cropTarget?.kind === "existing"
						? (toCroppedArea(cropTarget.image.croppedArea) ?? null)
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
				title={`Crop ${title.toLowerCase()}`}
			/>
		</section>
	);
}

export function PartyImagesEditor({ party }: { party: API.PartyDetails }) {
	const images = party.images ?? [];

	return (
		<div className="flex max-w-3xl flex-col gap-8">
			{ROLES.map((section) => (
				<RoleSection
					{...section}
					images={images.filter((image) => image.imageRole === section.role)}
					key={section.role}
					partyId={party.partyId}
				/>
			))}
		</div>
	);
}
