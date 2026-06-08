import { useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import type { PercentCrop } from "react-image-crop";

import "react-image-crop/dist/ReactCrop.css";
import { Button } from "#/components/coss/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type ImageCropDialogProps = {
	aspectRatio: number;
	confirmLabel?: string;
	description?: string;
	imageAlt: string;
	imageSrc: string | null;
	onConfirm: (croppedArea: CroppedArea) => Promise<void> | void;
	onOpenChange: (open: boolean) => void;
	onOpenChangeComplete?: (mounted: boolean) => void;
	open: boolean;
	title?: string;
};

type ImageCropDialogContentProps = {
	aspectRatio: number;
	confirmLabel: string;
	imageAlt: string;
	imageSrc: string;
	onConfirm: (croppedArea: CroppedArea) => Promise<void> | void;
};

function makeCenteredCrop(aspectRatio: number, width: number, height: number) {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 90,
			},
			aspectRatio,
			width,
			height,
		),
		width,
		height,
	);
}

function getNaturalCroppedArea(
	crop: PercentCrop,
	image: HTMLImageElement,
): CroppedArea {
	return {
		height: Math.round(image.naturalHeight * (crop.height / 100)),
		width: Math.round(image.naturalWidth * (crop.width / 100)),
		x: Math.round(image.naturalWidth * (crop.x / 100)),
		y: Math.round(image.naturalHeight * (crop.y / 100)),
	};
}

function ImageCropDialogContent({
	aspectRatio,
	confirmLabel,
	imageAlt,
	imageSrc,
	onConfirm,
}: ImageCropDialogContentProps) {
	const [crop, setCrop] = useState<PercentCrop>();
	const imageRef = useRef<HTMLImageElement>(null);

	function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
		const image = event.currentTarget;

		setCrop(
			makeCenteredCrop(aspectRatio, image.naturalWidth, image.naturalHeight),
		);
	}

	function handleConfirm() {
		if (!crop || !imageRef.current) return;

		void onConfirm(getNaturalCroppedArea(crop, imageRef.current));
	}

	return (
		<>
			<DialogPanel className="grid gap-4">
				<div className="flex justify-center rounded-xl border bg-muted/40 p-2">
					<ReactCrop
						aspect={aspectRatio}
						className="max-h-[60vh] max-w-full overflow-hidden rounded-lg [&_.ReactCrop__crop-selection]:border-primary [&_.ReactCrop__drag-handle]:border-primary"
						crop={crop}
						keepSelection
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						ruleOfThirds
					>
						<img
							ref={imageRef}
							alt={imageAlt}
							className="max-h-[56vh] max-w-full object-contain select-none"
							onLoad={handleImageLoad}
							src={imageSrc}
						/>
					</ReactCrop>
				</div>
			</DialogPanel>

			<DialogFooter>
				<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>

				<Button disabled={!crop} onClick={handleConfirm}>
					{confirmLabel}
				</Button>
			</DialogFooter>
		</>
	);
}

export function ImageCropDialog({
	aspectRatio,
	confirmLabel = "Apply crop",
	description = "Move and resize the crop area to choose the stored crop coordinates.",
	imageAlt,
	imageSrc,
	onConfirm,
	onOpenChange,
	onOpenChangeComplete,
	open,
	title = "Crop image",
}: ImageCropDialogProps) {
	return (
		<Dialog
			onOpenChange={onOpenChange}
			open={open}
			onOpenChangeComplete={onOpenChangeComplete}
		>
			<DialogPopup className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{imageSrc ? (
					<ImageCropDialogContent
						key={`${imageSrc}:${aspectRatio}`}
						aspectRatio={aspectRatio}
						confirmLabel={confirmLabel}
						imageAlt={imageAlt}
						imageSrc={imageSrc}
						onConfirm={onConfirm}
					/>
				) : (
					<>
						<DialogPanel className="grid gap-4">
							<div className="rounded-xl border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
								Choose an image before cropping.
							</div>
						</DialogPanel>

						<DialogFooter>
							<DialogClose render={<Button variant="ghost" />}>
								Cancel
							</DialogClose>

							<Button disabled>{confirmLabel}</Button>
						</DialogFooter>
					</>
				)}
			</DialogPopup>
		</Dialog>
	);
}
