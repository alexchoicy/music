import { FileIcon, FileVideoIcon, ImageIcon, MusicIcon } from "lucide-react";
import type { CSSProperties } from "react";

import type { ExtraDetails } from "#/lib/queries/extra.queries";
import { cn } from "#/lib/utils/styles";

import { getAssetThumbnailUrl, getExtraCover } from "./extraAssets";
import type { ExtraCrop } from "./extraAssets";

function getCropStyle(
	crop: ExtraCrop | undefined,
	width: number,
	height: number,
): CSSProperties | undefined {
	if (!crop || crop.width <= 0 || crop.height <= 0 || !width || !height)
		return undefined;
	return {
		height: `${(height / crop.height) * 100}%`,
		left: `${(-crop.x / crop.width) * 100}%`,
		top: `${(-crop.y / crop.height) * 100}%`,
		width: `${(width / crop.width) * 100}%`,
	};
}

function getFallbackIcon(extra: ExtraDetails) {
	const fileType = extra.assets?.[0]?.fileType;
	if (fileType === "Audio") return MusicIcon;
	if (fileType === "Video") return FileVideoIcon;
	if (fileType === "Document") return FileIcon;
	return ImageIcon;
}

export function ExtraCover({
	className,
	extra,
}: {
	className?: string;
	extra: ExtraDetails;
}) {
	const cover = getExtraCover(extra);
	const src = cover ? getAssetThumbnailUrl(cover.asset) : undefined;
	const cropStyle = cover
		? getCropStyle(
				cover.crop,
				Number(cover.asset.original?.width ?? 0),
				Number(cover.asset.original?.height ?? 0),
			)
		: undefined;
	const FallbackIcon = getFallbackIcon(extra);

	return (
		<span
			className={cn(
				"relative block aspect-square w-full overflow-hidden rounded-xl bg-muted",
				className,
			)}
		>
			{src ? (
				<img
					alt=""
					className={cn(
						cropStyle
							? "absolute max-w-none object-fill"
							: "size-full object-cover",
					)}
					loading="lazy"
					src={src}
					style={cropStyle}
				/>
			) : (
				<span className="flex size-full items-center justify-center text-muted-foreground">
					<FallbackIcon aria-hidden="true" className="size-10" />
				</span>
			)}
		</span>
	);
}
