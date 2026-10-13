import {
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleAlertIcon,
	ClockIcon,
	ExternalLinkIcon,
	FileIcon,
	FileVideoIcon,
	MusicIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPopup,
	DialogTitle,
} from "#/components/base/dialog";
import { ScrollArea } from "#/components/base/scroll-area";
import { MEDIA_SOURCE } from "#/enums/albumEnums";
import { EXTRA_CATEGORY } from "#/enums/extraEnums";
import type {
	ExtraAssetDetails,
	ExtraDetails,
} from "#/lib/queries/extra.queries";
import { cn } from "#/lib/utils/styles";

import {
	getAssetContentUrl,
	getAssetName,
	getAssetPreviewUrl,
	getAssetStatusLabel,
	getAssetThumbnailUrl,
	isMediaExtra,
} from "./extraAssets";
import { ExtraMedia } from "./ExtraMedia";

const HIDDEN_SOURCES = new Set(["Unknown", "UserUpload"]);

export function ExtraViewerDialog({
	extra,
	onClose,
}: {
	extra: ExtraDetails;
	onClose: () => void;
}) {
	const assets = extra.assets ?? [];
	const mediaOnly = isMediaExtra(extra);
	const [index, setIndex] = useState(0);
	const asset = assets.at(index);
	const hasPrevious = index > 0;
	const hasNext = index < assets.length - 1;

	// Warm the cache so paging through a booklet feels instant.
	useEffect(() => {
		const next = assets.at(index + 1);
		const nextUrl = next ? getAssetPreviewUrl(next) : undefined;
		if (nextUrl) new Image().src = nextUrl;
	}, [assets, index]);

	// Focus stays inside the dialog, so paging keys are handled on the popup.
	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		// Media controls use the arrow keys to seek.
		if (event.target instanceof HTMLMediaElement) return;
		if (event.key === "ArrowLeft" && hasPrevious) {
			event.preventDefault();
			setIndex(index - 1);
		} else if (event.key === "ArrowRight" && hasNext) {
			event.preventDefault();
			setIndex(index + 1);
		}
	}

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open
		>
			<DialogPopup
				bottomStickOnMobile={false}
				className={cn(
					!mediaOnly
						? "h-[min(820px,calc(100dvh-2rem))] max-w-5xl"
						: asset?.fileType === "Video"
							? "max-w-4xl"
							: "max-w-xl",
				)}
				onKeyDown={handleKeyDown}
			>
				<DialogHeader>
					<div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 pe-8">
						<DialogTitle>{extra.title}</DialogTitle>
						<Badge size="sm" variant="outline">
							{EXTRA_CATEGORY[extra.category]}
						</Badge>
						{!HIDDEN_SOURCES.has(extra.source) && (
							<Badge size="sm" variant="outline">
								{MEDIA_SOURCE[extra.source]}
							</Badge>
						)}
					</div>
					{extra.description && (
						<DialogDescription>{extra.description}</DialogDescription>
					)}
				</DialogHeader>

				{!asset ? (
					<p className="px-6 pb-6 text-sm text-muted-foreground">
						This extra has no files yet.
					</p>
				) : mediaOnly ? (
					<div className="px-6 pb-6">
						<MediaStage asset={asset} />
					</div>
				) : (
					<>
						<div className="relative mx-6 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-background">
							<AssetStage asset={asset} />
							{hasPrevious && (
								<Button
									aria-label="Previous file"
									className="absolute start-3 top-1/2 -translate-y-1/2"
									onClick={() => setIndex(index - 1)}
									size="icon-lg"
									variant="overlay"
								>
									<ChevronLeftIcon aria-hidden="true" />
								</Button>
							)}
							{hasNext && (
								<Button
									aria-label="Next file"
									className="absolute end-3 top-1/2 -translate-y-1/2"
									onClick={() => setIndex(index + 1)}
									size="icon-lg"
									variant="overlay"
								>
									<ChevronRightIcon aria-hidden="true" />
								</Button>
							)}
						</div>

						<div className="flex items-center gap-3 px-6 pt-3">
							<span
								className="min-w-0 flex-1 truncate text-sm font-semibold"
								title={getAssetName(asset)}
							>
								{getAssetName(asset)}
							</span>
							<span
								aria-live="polite"
								className="shrink-0 text-xs tabular-nums"
							>
								{index + 1} / {assets.length}
							</span>
							<OpenOriginalButton asset={asset} />
						</div>

						{assets.length > 1 ? (
							<ThumbnailStrip
								assets={assets}
								index={index}
								onSelect={setIndex}
							/>
						) : (
							<div className="pb-6" />
						)}
					</>
				)}
			</DialogPopup>
		</Dialog>
	);
}

function OpenOriginalButton({ asset }: { asset: ExtraAssetDetails }) {
	const url = getAssetContentUrl(asset);
	if (!url || asset.processingStatus === "Pending") return null;
	return (
		<Button
			className="shrink-0"
			render={<a href={url} rel="noreferrer" target="_blank" />}
			size="sm"
			variant="ghost"
		>
			<ExternalLinkIcon aria-hidden="true" />
			<span className="max-sm:sr-only">Open original</span>
		</Button>
	);
}

function AssetStatus({ asset }: { asset: ExtraAssetDetails }) {
	const label = getAssetStatusLabel(asset) ?? "Not available";
	const Icon = label === "Failed" ? CircleAlertIcon : ClockIcon;
	return (
		<div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
			<Icon aria-hidden="true" className="size-8" />
			<span className="text-sm">{label}</span>
		</div>
	);
}

function isUnavailable(asset: ExtraAssetDetails) {
	return asset.processingStatus === "Pending" || !asset.original;
}

function MediaStage({ asset }: { asset: ExtraAssetDetails }) {
	if (isUnavailable(asset)) {
		return (
			<div className="flex min-h-48 items-center justify-center rounded-xl bg-background">
				<AssetStatus asset={asset} />
			</div>
		);
	}

	return (
		<ExtraMedia
			asset={asset}
			className={
				asset.fileType === "Video"
					? "block max-h-[calc(100dvh-12rem)] w-full rounded-xl bg-black"
					: "block w-full"
			}
			key={asset.assetId}
		/>
	);
}

function AssetStage({ asset }: { asset: ExtraAssetDetails }) {
	if (isUnavailable(asset)) return <AssetStatus asset={asset} />;

	switch (asset.fileType) {
		case "Image":
			return (
				<img
					alt={getAssetName(asset)}
					className="max-h-full max-w-full object-contain"
					key={asset.assetId}
					src={getAssetPreviewUrl(asset)}
				/>
			);
		case "Video":
			return (
				<ExtraMedia
					asset={asset}
					className="max-h-full max-w-full"
					key={asset.assetId}
				/>
			);
		case "Audio":
			return (
				<div className="flex w-full max-w-md flex-col items-center gap-4 p-6 text-muted-foreground">
					<MusicIcon aria-hidden="true" className="size-10" />
					<ExtraMedia asset={asset} className="w-full" key={asset.assetId} />
				</div>
			);
		default:
			return (
				<div className="flex flex-col items-center gap-3 p-6 text-muted-foreground">
					<FileIcon aria-hidden="true" className="size-10" />
					<Button
						render={
							<a
								href={getAssetContentUrl(asset)}
								rel="noreferrer"
								target="_blank"
							/>
						}
						variant="outline"
					>
						Open file
					</Button>
				</div>
			);
	}
}

function AssetThumbnailIcon({ asset }: { asset: ExtraAssetDetails }) {
	const Icon =
		asset.fileType === "Audio"
			? MusicIcon
			: asset.fileType === "Video"
				? FileVideoIcon
				: FileIcon;
	return <Icon aria-hidden="true" className="size-5" />;
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

	useEffect(() => {
		itemRefs.current[index]?.scrollIntoView({
			// Instant: smooth scrolling is cancelled by fast paging.
			behavior: "auto",
			block: "nearest",
			inline: "nearest",
		});
	}, [index]);

	return (
		<ScrollArea className="h-auto shrink-0" scrollFade>
			<div className="flex w-max gap-2 px-6 pt-2 pb-5">
				{assets.map((item, itemIndex) => {
					const thumbnailUrl = getAssetThumbnailUrl(item);
					const isCurrent = itemIndex === index;

					return (
						<button
							aria-current={isCurrent}
							aria-label={`File ${itemIndex + 1}: ${getAssetName(item)}`}
							className={cn(
								"relative size-14 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover sm:size-16",
								isCurrent
									? "after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-primary"
									: "opacity-60 hover:opacity-100",
							)}
							key={item.assetId}
							onClick={() => onSelect(itemIndex)}
							ref={(element) => {
								itemRefs.current[itemIndex] = element;
							}}
							type="button"
						>
							<span className="flex size-full items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
								{thumbnailUrl ? (
									<img
										alt=""
										className="size-full object-cover"
										loading="lazy"
										src={thumbnailUrl}
									/>
								) : (
									<AssetThumbnailIcon asset={item} />
								)}
							</span>
						</button>
					);
				})}
			</div>
		</ScrollArea>
	);
}
