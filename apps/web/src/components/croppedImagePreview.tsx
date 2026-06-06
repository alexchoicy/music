import type { CSSProperties, ReactNode } from "react";

import { cn } from "#/lib/utils/styles";
import type { CroppedArea } from "#/store/albumUploadStoreType";

type CroppedImagePreviewProps = {
	alt: string;
	fallback: ReactNode;
	src?: string;
	croppedArea: CroppedArea;
	height: number;
	width: number;
	className?: string;
};

function getCroppedImageStyle({
	croppedArea,
	height,
	width,
}: {
	croppedArea: CroppedArea;
	height: number;
	width: number;
}) {
	if (croppedArea.width <= 0 || croppedArea.height <= 0) return undefined;

	if (
		croppedArea.x === 0 &&
		croppedArea.y === 0 &&
		croppedArea.width === width &&
		croppedArea.height === height
	) {
		return undefined;
	}

	return {
		height: `${(height / croppedArea.height) * 100}%`,
		left: `${(-croppedArea.x / croppedArea.width) * 100}%`,
		top: `${(-croppedArea.y / croppedArea.height) * 100}%`,
		width: `${(width / croppedArea.width) * 100}%`,
	} satisfies CSSProperties;
}

export function CroppedImagePreview({
	alt,
	className,
	croppedArea,
	fallback,
	height,
	src,
	width,
}: CroppedImagePreviewProps) {
	const cropStyle = getCroppedImageStyle({ croppedArea, height, width });

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-xl border bg-muted shadow-xs",
				className,
			)}
		>
			{src ? (
				<img
					alt={alt}
					className={cn(
						cropStyle
							? "absolute max-w-none object-fill"
							: "size-full object-cover",
					)}
					src={src}
					style={cropStyle}
				/>
			) : (
				<div className="flex size-full items-center justify-center bg-linear-to-br from-muted to-background text-muted-foreground">
					{fallback}
				</div>
			)}
		</div>
	);
}
