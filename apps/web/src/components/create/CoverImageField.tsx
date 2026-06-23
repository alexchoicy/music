import { ImageIcon } from "lucide-react";
import type { ChangeEvent } from "react";

import { Button } from "#/components/coss/button";
import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import { COVER_IMAGE_ACCEPT } from "#/constant/album";
import type { CoverAsset } from "#/store/albumUploadStoreType";

import { CroppedImagePreview } from "../croppedImagePreview";

type CoverImageFieldProps = {
	className?: string;
	cover?: CoverAsset;
	inputId: string;
	label: string;
	name: string;
	onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function CoverImageField({
	className,
	cover,
	inputId,
	label,
	name,
	onFileChange,
}: CoverImageFieldProps) {
	return (
		<Field className={className} name={name}>
			<FieldLabel>{label}</FieldLabel>
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
				<div className="grid gap-1.5">
					<input
						accept={COVER_IMAGE_ACCEPT}
						className="sr-only"
						id={inputId}
						onChange={onFileChange}
						type="file"
					/>
					<div>
						<Button render={<label htmlFor={inputId} />}>
							{cover ? "Change Image" : "Upload Image"}
						</Button>
					</div>
					<FieldDescription>Supported formats: JPEG, PNG</FieldDescription>
				</div>
			</div>
		</Field>
	);
}
