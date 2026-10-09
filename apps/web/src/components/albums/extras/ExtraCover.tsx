import { ImageIcon } from "lucide-react";

import { CroppedImagePreview } from "#/components/croppedImagePreview";
import { cn } from "#/lib/utils/styles";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type ExtraCoverProps = {
	alt: string;
	className?: string;
	croppedArea?: CroppedArea;
	height: number;
	src?: string;
	width: number;
};

// Without an explicit crop the whole page is shown, scans are rarely square
export function ExtraCover({
	alt,
	className,
	croppedArea,
	height,
	src,
	width,
}: ExtraCoverProps) {
	if (croppedArea || !src) {
		return (
			<CroppedImagePreview
				alt={alt}
				className={className}
				croppedArea={croppedArea}
				fallback={<ImageIcon aria-hidden="true" className="size-8" />}
				height={height}
				src={src}
				width={width}
			/>
		);
	}

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-xl border bg-muted p-1.5 shadow-xs",
				className,
			)}
		>
			<img alt={alt} className="size-full object-contain" src={src} />
		</div>
	);
}
