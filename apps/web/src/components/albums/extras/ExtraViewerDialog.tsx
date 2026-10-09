import {
	ChevronLeftIcon,
	ChevronRightIcon,
	ExternalLinkIcon,
	FileIcon,
	FileVideoIcon,
	MusicIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPopup,
	DialogTitle,
} from "#/components/coss/dialog";
import { EXTRA_CATEGORY } from "#/enums/extraEnums";
import type {
	ExtraAssetDetails,
	ExtraDetails,
} from "#/lib/queries/extra.queries";
import { cn } from "#/lib/utils/styles";

import {
	getAssetPreviewUrl,
	getAssetStatusLabel,
	getAssetThumbnailUrl,
} from "./extraUtils";

function getContentUrl(asset: ExtraAssetDetails) {
	return asset.original ? `${asset.original.url}/play` : undefined;
}

function getOpenUrl(asset: ExtraAssetDetails) {
	return asset.fileType === "Image"
		? asset.original?.url
		: getContentUrl(asset);
}

function AssetIcon({
	asset,
	className,
}: {
	asset: ExtraAssetDetails;
	className?: string;
}) {
	const Icon =
		asset.fileType === "Audio"
			? MusicIcon
			: asset.fileType === "Video"
				? FileVideoIcon
				: FileIcon;
	return <Icon aria-hidden="true" className={className} />;
}

function AssetStage({ asset }: { asset: ExtraAssetDetails }) {
	const statusLabel = getAssetStatusLabel(asset);

	if (asset.processingStatus === "Pending" || !asset.original) {
		return (
			<div className="grid justify-items-center gap-3 text-muted-foreground">
				<AssetIcon asset={asset} className="size-10" />
				<span className="text-sm">{statusLabel ?? "Not available"}</span>
			</div>
		);
	}

	switch (asset.fileType) {
		case "Image":
			return (
				<img
					alt={asset.title ?? asset.originalFileName}
					className="max-h-full max-w-full object-contain"
					data-testid="extra-viewer-image"
					key={asset.assetId}
					src={getAssetPreviewUrl(asset)}
				/>
			);
		case "Audio":
			return (
				<div className="grid w-full max-w-md justify-items-center gap-4 text-muted-foreground">
					<MusicIcon aria-hidden="true" className="size-12" />
					<audio
						className="w-full"
						controls
						key={asset.assetId}
						preload="metadata"
						src={getContentUrl(asset)}
					/>
				</div>
			);
		case "Video":
			return (
				<video
					className="max-h-full max-w-full"
					controls
					key={asset.assetId}
					preload="metadata"
					src={getContentUrl(asset)}
				/>
			);
		default:
			return (
				<div className="grid justify-items-center gap-3 text-muted-foreground">
					<FileIcon aria-hidden="true" className="size-10" />
					<Button
						render={
							<a href={getContentUrl(asset)} rel="noreferrer" target="_blank" />
						}
						variant="outline"
					>
						Open file
					</Button>
				</div>
			);
	}
}

function ThumbnailStrip({
	assets,
	index,
	onSelect,
}: {
	assets: ExtraAssetDetails[];
	index: number;
	onSelect: (index: number) => void;
}) {
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Keep the current page visible when paging with keys or buttons
	useEffect(() => {
		itemRefs.current[index]?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "nearest",
		});
	}, [index]);

	return (
		<div className="flex shrink-0 gap-1.5 overflow-x-auto p-1">
			{assets.map((item, itemIndex) => {
				const thumbnailUrl = getAssetThumbnailUrl(item);
				const isCurrent = itemIndex === index;

				return (
					<button
						aria-current={isCurrent}
						aria-label={item.title || item.originalFileName}
						className={cn(
							"size-16 shrink-0 rounded-lg border-2 p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
							isCurrent
								? "border-primary"
								: "border-transparent hover:border-border",
						)}
						key={item.assetId}
						onClick={() => onSelect(itemIndex)}
						ref={(element) => {
							itemRefs.current[itemIndex] = element;
						}}
						type="button"
					>
						<span className="flex size-full items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
							{thumbnailUrl ? (
								<img
									alt=""
									className="size-full object-contain"
									loading="lazy"
									src={thumbnailUrl}
								/>
							) : (
								<AssetIcon asset={item} className="size-5" />
							)}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export function ExtraViewerDialog({
	extra,
	onClose,
}: {
	extra: ExtraDetails;
	onClose: () => void;
}) {
	const assets = extra.assets ?? [];
	const [index, setIndex] = useState(0);
	const asset = assets.at(index);
	const hasPrevious = index > 0;
	const hasNext = index < assets.length - 1;

	// Warm the cache so paging through a booklet feels instant
	useEffect(() => {
		const next = assets.at(index + 1);
		const nextUrl = next ? getAssetPreviewUrl(next) : undefined;
		if (nextUrl) new Image().src = nextUrl;
	}, [assets, index]);

	const openUrl = asset ? getOpenUrl(asset) : undefined;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPopup
				bottomStickOnMobile={false}
				className="max-w-6xl"
				// Focus is trapped inside the dialog, so handle paging keys here
				onKeyDown={(event) => {
					if (event.key === "ArrowLeft" && hasPrevious) {
						event.preventDefault();
						setIndex(index - 1);
					} else if (event.key === "ArrowRight" && hasNext) {
						event.preventDefault();
						setIndex(index + 1);
					}
				}}
			>
				<DialogHeader>
					<DialogTitle>{extra.title}</DialogTitle>
					<DialogDescription render={<div />}>
						<span className="flex flex-wrap items-center gap-2">
							<Badge size="sm" variant="secondary">
								{EXTRA_CATEGORY[extra.category]}
							</Badge>
							{extra.description && <span>{extra.description}</span>}
						</span>
					</DialogDescription>
				</DialogHeader>

				{asset ? (
					<div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
						<div
							className="relative flex h-[65vh] min-h-40 shrink items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-2"
							data-testid="extra-viewer-stage"
						>
							<AssetStage asset={asset} />

							<Button
								aria-label="Previous"
								className="absolute start-2 top-1/2 -translate-y-1/2"
								disabled={!hasPrevious}
								onClick={() => setIndex(index - 1)}
								size="icon"
								variant="outline"
							>
								<ChevronLeftIcon aria-hidden="true" />
							</Button>
							<Button
								aria-label="Next"
								className="absolute end-2 top-1/2 -translate-y-1/2"
								disabled={!hasNext}
								onClick={() => setIndex(index + 1)}
								size="icon"
								variant="outline"
							>
								<ChevronRightIcon aria-hidden="true" />
							</Button>
						</div>

						<div className="flex shrink-0 items-center justify-between gap-3 text-sm">
							<span className="min-w-0 truncate">
								{asset.title || asset.originalFileName}
							</span>
							<div className="flex shrink-0 items-center gap-3 text-muted-foreground">
								<span data-testid="extra-viewer-counter">
									{index + 1} / {assets.length}
								</span>
								{openUrl && (
									<Button
										render={
											<a href={openUrl} rel="noreferrer" target="_blank" />
										}
										size="sm"
										variant="ghost"
									>
										<ExternalLinkIcon aria-hidden="true" />
										Original
									</Button>
								)}
							</div>
						</div>

						{assets.length > 1 && (
							<ThumbnailStrip
								assets={assets}
								index={index}
								onSelect={setIndex}
							/>
						)}
					</div>
				) : (
					<p className="px-6 pb-6 text-sm text-muted-foreground">
						This extra has no files yet.
					</p>
				)}
			</DialogPopup>
		</Dialog>
	);
}
