import { useSortable } from "@dnd-kit/react/sortable";
import {
	CropIcon,
	ExternalLinkIcon,
	FileIcon,
	FileVideoIcon,
	GripVerticalIcon,
	MusicIcon,
	StarIcon,
	Trash2Icon,
} from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { Input } from "#/components/coss/input";
import type { components } from "#/data/APIschema";
import type { PreparedExtraFile } from "#/lib/upload/extraUpload";
import { formatFileSize } from "#/lib/utils/file";
import { cn } from "#/lib/utils/styles";

type FileType = components["schemas"]["FileType"];

export type ExtraAssetDraft = {
	id: string;
	assetId: string | null;
	title: string;
	fileName: string;
	fileType: FileType;
	sizeInBytes: number | null;
	thumbnailUrl: string | null;
	// Image used for cropping, can be a smaller preview than the original
	cropSourceUrl: string | null;
	// Multiplier from crop source pixels to original pixels
	cropScale: number;
	width: number | null;
	height: number | null;
	openUrl: string | null;
	statusLabel: string | null;
	prepared: PreparedExtraFile | null;
};

type ExtraAssetRowProps = {
	asset: ExtraAssetDraft;
	index: number;
	isCover: boolean;
	disabled: boolean;
	onTitleChange: (id: string, title: string) => void;
	onRemove: (id: string) => void;
	onSetCover: (id: string) => void;
	onCrop: (id: string) => void;
};

function FileTypeIcon({ fileType }: { fileType: FileType }) {
	switch (fileType) {
		case "Audio":
			return <MusicIcon aria-hidden="true" className="size-5" />;
		case "Video":
			return <FileVideoIcon aria-hidden="true" className="size-5" />;
		default:
			return <FileIcon aria-hidden="true" className="size-5" />;
	}
}

export function ExtraAssetRow({
	asset,
	index,
	isCover,
	disabled,
	onTitleChange,
	onRemove,
	onSetCover,
	onCrop,
}: ExtraAssetRowProps) {
	const { handleRef, isDragging, ref } = useSortable({
		group: "extra-assets",
		id: asset.id,
		index,
		disabled,
	});
	const size = asset.sizeInBytes ? formatFileSize(asset.sizeInBytes) : null;

	return (
		<div
			className={cn(
				"grid grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition-opacity",
				isDragging && "opacity-50",
			)}
			data-testid="extra-asset-row"
			ref={ref}
		>
			<Button
				aria-label={`Drag ${asset.fileName}`}
				disabled={disabled}
				ref={handleRef}
				size="icon-sm"
				variant="ghost"
			>
				<GripVerticalIcon aria-hidden="true" />
			</Button>

			<div className="flex size-14 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
				{asset.thumbnailUrl ? (
					<img
						alt=""
						className="size-full object-cover"
						src={asset.thumbnailUrl}
					/>
				) : (
					<FileTypeIcon fileType={asset.fileType} />
				)}
			</div>

			<div className="grid min-w-0 gap-1">
				<Input
					aria-label={`Title for ${asset.fileName}`}
					disabled={disabled}
					onChange={(event) => onTitleChange(asset.id, event.target.value)}
					placeholder="Optional label, e.g. Back, Obi"
					size="sm"
					value={asset.title}
				/>
				<div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
					<span className="truncate">{asset.fileName}</span>
					{size && <span className="shrink-0">· {size}</span>}
					{isCover && (
						<Badge className="shrink-0" size="sm" variant="info">
							Cover
						</Badge>
					)}
					{!asset.assetId && (
						<Badge className="shrink-0" size="sm" variant="secondary">
							New
						</Badge>
					)}
					{asset.statusLabel && (
						<Badge
							className="shrink-0"
							size="sm"
							variant={asset.statusLabel === "Failed" ? "error" : "warning"}
						>
							{asset.statusLabel}
						</Badge>
					)}
				</div>
			</div>

			<div className="flex items-center gap-0.5">
				{asset.fileType === "Image" && (
					<Button
						aria-label={isCover ? "Current cover" : "Use as cover"}
						aria-pressed={isCover}
						disabled={disabled}
						onClick={() => onSetCover(asset.id)}
						size="icon-sm"
						title={isCover ? "Current cover" : "Use as cover"}
						variant="ghost"
					>
						<StarIcon
							aria-hidden="true"
							className={cn(isCover && "fill-current text-amber-500")}
						/>
					</Button>
				)}
				{isCover && (
					<Button
						aria-label="Crop cover"
						disabled={disabled || !asset.cropSourceUrl}
						onClick={() => onCrop(asset.id)}
						size="icon-sm"
						title="Crop cover"
						variant="ghost"
					>
						<CropIcon aria-hidden="true" />
					</Button>
				)}
				{asset.openUrl && (
					<Button
						aria-label={`Open ${asset.fileName}`}
						render={<a href={asset.openUrl} rel="noreferrer" target="_blank" />}
						size="icon-sm"
						title="Open file"
						variant="ghost"
					>
						<ExternalLinkIcon aria-hidden="true" />
					</Button>
				)}
				<Button
					aria-label={`Remove ${asset.fileName}`}
					disabled={disabled}
					onClick={() => onRemove(asset.id)}
					size="icon-sm"
					title="Remove"
					variant="ghost"
				>
					<Trash2Icon aria-hidden="true" />
				</Button>
			</div>
		</div>
	);
}
