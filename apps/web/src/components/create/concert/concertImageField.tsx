import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "#/components/coss/button";
import { Field, FieldLabel } from "#/components/coss/field";
import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { ImageCropDialog } from "#/components/imageCropDialog";
import { COVER_IMAGE_ACCEPT } from "#/constant/album";
import type { CroppedArea } from "#/store/albumUploadStoreType";
import { useConcertUploadStore } from "#/store/concertUploadStore";

type ConcertImageCandidate = {
	file: File;
	src: string;
};

const CONCERT_IMAGE_ASPECT_RATIO = 16 / 9;

export function ConcertImageField() {
	const inputId = useId();
	const image = useConcertUploadStore((state) => state.image);
	const setImage = useConcertUploadStore((state) => state.setImage);
	const [imageCandidate, setImageCandidate] =
		useState<ConcertImageCandidate | null>(null);
	const [isImageCropOpen, setIsImageCropOpen] = useState(false);

	function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";

		if (!file) return;

		setImageCandidate({ file, src: URL.createObjectURL(file) });
		setIsImageCropOpen(true);
	}

	function handleImageCropCloseComplete() {
		if (isImageCropOpen) return;

		if (imageCandidate) URL.revokeObjectURL(imageCandidate.src);
		setImageCandidate(null);
	}

	async function handleImageCropConfirm(croppedArea: CroppedArea) {
		if (!imageCandidate) return;

		await setImage(imageCandidate.file, croppedArea);
		setIsImageCropOpen(false);
	}

	return (
		<>
			<Field name="concert-image">
				<FieldLabel>Concert image</FieldLabel>
				<div className="grid w-full gap-3">
					<label className="block w-full cursor-pointer" htmlFor={inputId}>
						<CroppedImagePreview
							alt="Concert preview"
							className="aspect-video w-full rounded-2xl"
							croppedArea={image?.croppedArea}
							fallback={<ImageIcon aria-hidden="true" className="size-8" />}
							height={image?.height ?? 1}
							src={image?.localURL}
							width={image?.width ?? 1}
						/>
					</label>
					<input
						accept={COVER_IMAGE_ACCEPT}
						className="sr-only"
						id={inputId}
						onChange={handleImageChange}
						type="file"
					/>
					<Button
						className="sm:shrink-0"
						render={<label htmlFor={inputId} />}
						size="sm"
					>
						{image ? "Change Image" : "Upload Image"}
					</Button>
				</div>
			</Field>

			<ImageCropDialog
				aspectRatio={CONCERT_IMAGE_ASPECT_RATIO}
				confirmLabel="Use crop"
				description="Choose the 16:9 crop for this concert image."
				imageAlt="Selected concert image"
				imageSrc={imageCandidate?.src ?? null}
				onConfirm={handleImageCropConfirm}
				onOpenChange={setIsImageCropOpen}
				onOpenChangeComplete={handleImageCropCloseComplete}
				open={isImageCropOpen}
				title="Crop concert image"
			/>
		</>
	);
}
