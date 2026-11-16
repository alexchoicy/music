import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent } from "react";

import { Button } from "#/components/base/button";
import { Field, FieldLabel } from "#/components/base/field";
import { CroppedImagePreview } from "#/components/image/CroppedImagePreview";
import { ImageCropDialog } from "#/components/image/ImageCropDialog";
import { COVER_IMAGE_ACCEPT } from "#/constant/album";
import type { CroppedArea } from "#/store/albumUploadStoreType";
import { useConcertUploadStore } from "#/store/concertUploadStore";

const CONCERT_IMAGE_ASPECT_RATIO = 16 / 9;

export function ConcertImageField() {
	const inputId = useId();
	const image = useConcertUploadStore((state) => state.image);
	const setImage = useConcertUploadStore((state) => state.setImage);
	const [candidate, setCandidate] = useState<{
		file: File;
		src: string;
	} | null>(null);
	const [isCropOpen, setIsCropOpen] = useState(false);

	function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		setCandidate({ file, src: URL.createObjectURL(file) });
		setIsCropOpen(true);
	}

	async function handleCropConfirm(croppedArea: CroppedArea) {
		if (!candidate) return;

		await setImage(candidate.file, croppedArea);
		setIsCropOpen(false);
	}

	return (
		<Field>
			<FieldLabel nativeLabel={false} render={<div />}>
				Image
			</FieldLabel>
			<div className="grid w-full gap-3">
				<label className="block w-full cursor-pointer" htmlFor={inputId}>
					<CroppedImagePreview
						alt="Concert image"
						className="aspect-video w-full"
						croppedArea={image?.croppedArea}
						fallback={<ImageIcon aria-hidden="true" className="size-8" />}
						height={image?.height ?? 0}
						src={image?.localURL}
						width={image?.width ?? 0}
					/>
				</label>
				<input
					accept={COVER_IMAGE_ACCEPT}
					className="sr-only"
					id={inputId}
					onChange={handleFileChange}
					type="file"
				/>
				<Button className="w-full" render={<label htmlFor={inputId} />}>
					{image ? "Replace image" : "Upload image"}
				</Button>
			</div>

			<ImageCropDialog
				aspectRatio={CONCERT_IMAGE_ASPECT_RATIO}
				confirmLabel="Use crop"
				description="Choose the 16:9 area used as the concert image."
				imageAlt="Concert image"
				imageSrc={candidate?.src ?? null}
				onConfirm={handleCropConfirm}
				onOpenChange={setIsCropOpen}
				onOpenChangeComplete={(open) => {
					if (open || !candidate) return;
					URL.revokeObjectURL(candidate.src);
					setCandidate(null);
				}}
				open={isCropOpen}
				title="Crop concert image"
			/>
		</Field>
	);
}
