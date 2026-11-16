import { ImageIcon } from "lucide-react";
import { useId, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { Button } from "#/components/base/button";
import { CroppedImagePreview } from "#/components/image/CroppedImagePreview";
import { ImageCropDialog } from "#/components/image/ImageCropDialog";
import { ALBUM_COVER_ASPECT_RATIO, COVER_IMAGE_ACCEPT } from "#/constant/album";
import { createCoverAsset } from "#/lib/utils/upload";
import type { CoverAsset, CroppedArea } from "#/store/albumUploadStoreType";

export function CoverField({
	actions,
	cover,
	label,
	note,
	onChange,
}: {
	actions?: ReactNode;
	cover: CoverAsset | undefined;
	label: string;
	note?: string;
	onChange: (cover: CoverAsset) => void;
}) {
	const inputId = useId();
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

		const asset = await createCoverAsset(
			candidate.file,
			candidate.file.name,
			croppedArea,
		);
		if (asset) onChange(asset);
		setIsCropOpen(false);
	}

	return (
		<div className="flex items-center gap-4">
			<CroppedImagePreview
				alt={label}
				className="size-24 shrink-0"
				croppedArea={cover?.croppedArea}
				fallback={<ImageIcon aria-hidden="true" className="size-7" />}
				height={cover?.height ?? 0}
				src={cover?.localURL}
				width={cover?.width ?? 0}
			/>
			<div className="grid min-w-0 gap-2">
				<span className="text-sm font-medium">{label}</span>
				{note && <span className="text-xs text-muted-foreground">{note}</span>}
				<input
					accept={COVER_IMAGE_ACCEPT}
					className="sr-only"
					id={inputId}
					onChange={handleFileChange}
					type="file"
				/>
				<div className="flex flex-wrap gap-2">
					<Button
						render={<label htmlFor={inputId} />}
						size="sm"
						variant="outline"
					>
						{cover ? "Replace image" : "Upload image"}
					</Button>
					{actions}
				</div>
			</div>

			<ImageCropDialog
				aspectRatio={ALBUM_COVER_ASPECT_RATIO}
				confirmLabel="Use crop"
				description="Choose the square area used as the cover."
				imageAlt={label}
				imageSrc={candidate?.src ?? null}
				onConfirm={handleCropConfirm}
				onOpenChange={setIsCropOpen}
				onOpenChangeComplete={(open) => {
					if (open || !candidate) return;
					URL.revokeObjectURL(candidate.src);
					setCandidate(null);
				}}
				open={isCropOpen}
				title={`Crop ${label.toLowerCase()}`}
			/>
		</div>
	);
}
