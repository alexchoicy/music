import { Download, MoreVertical, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { components } from "@/data/APIschema";
import { FILE_SOURCES } from "@/enums/track";
import { downloadTrack } from "@/lib/queries/track.queries";
import { getMMSSFromMs } from "@/lib/utils/display";
import { Button } from "../shadcn/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";

type AlbumTrackListProps = {
	track: components["schemas"]["AlbumTrackDetailsModel"];
	handlePlay: (trackId?: number) => void;
};

function formatFileSize(sizeInBytes?: number | string | null) {
	if (sizeInBytes == null) return null;

	const bytes = Number(sizeInBytes);

	if (!Number.isFinite(bytes) || bytes <= 0) return null;

	const units = ["B", "KB", "MB", "GB"];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const precision = value >= 100 || unitIndex === 0 ? 0 : 1;

	return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatBitrate(bitrate?: number | string | null) {
	if (bitrate == null) return null;

	const value = Number(bitrate);

	if (!Number.isFinite(value) || value <= 0) return null;

	return `${Math.round(value / 1000)} kbps`;
}

export function AlbumTrackListItem({ track, handlePlay }: AlbumTrackListProps) {
	const [isDownloading, setIsDownloading] = useState(false);

	const printTime = useMemo(() => {
		if (!track.durationInMs) return null;

		return getMMSSFromMs(Number(track.durationInMs));
	}, [track.durationInMs]);

	const downloadSources = useMemo(() => {
		const defaultVariant = track.trackVariants[0];

		if (!defaultVariant) return [];

		return defaultVariant.sources.map((source, index) => ({
			key: `${source.source}-${source.rank}-${index}`,
			label:
				FILE_SOURCES.find((item) => item.value === source.source)?.label ||
				source.source,
			variants: [
				{
					label: "Original",
					value: "Original" as const,
					meta: [
						formatFileSize(source.file.original.sizeInBytes),
						formatBitrate(source.file.original.bitrate),
					]
						.filter(Boolean)
						.join(" • "),
				},
				...(source.file.opus96
					? [
							{
								label: "Opus 96K",
								value: "Opus96" as const,
								meta: [
									formatFileSize(source.file.opus96.sizeInBytes),
									formatBitrate(source.file.opus96.bitrate),
								]
									.filter(Boolean)
									.join(" • "),
							},
						]
					: []),
			],
		}));
	}, [track.trackVariants]);

	const handleDownload = async (
		variant: components["schemas"]["FileObjectVariant"],
	) => {
		if (isDownloading) return;

		setIsDownloading(true);

		try {
			const downloadItem = await downloadTrack(track.trackId, variant);

			const anchor = document.createElement("a");
			anchor.href = downloadItem.url;
			anchor.download = downloadItem.fileName;
			anchor.rel = "noopener noreferrer";
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		} catch {
			toast.error("Failed to download track");
		} finally {
			setIsDownloading(false);
		}
	};

	const playTrack = () => {
		handlePlay(Number(track.trackId));
	};

	const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) return;
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		playTrack();
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: button!
		<div
			className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-4 py-3 hover:bg-secondary cursor-pointer"
			onClick={playTrack}
			role="button"
			onKeyDown={handleRowKeyDown}
			tabIndex={0}
		>
			<div className="flex w-8 items-center justify-center">
				<div className="group-hover:hidden w-8 flex items-center text-center justify-center shrink-0">
					{track.trackNumber}
				</div>
				<div className="hidden h-8 w-8 items-center justify-center p-0 group-hover:flex">
					<Play className="size-fit" />
				</div>
			</div>
			<div className="min-w-0">
				<div className="font-medium text-base">{track.title}</div>
				<div className="text-sm text-muted-foreground">
					{track.credits.map((party) => party.name).join(", ")}
				</div>
			</div>
			<div className="text-sm flex items-center justify-center text-muted-foreground shrink-0 ">
				{printTime}
			</div>
			<div className="w-8 flex items-center justify-center shrink-0">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon"
								className=" flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={(event) => event.stopPropagation()}
							>
								<MoreVertical className="size-fit" />
							</Button>
						}
					/>
					<DropdownMenuContent className="w-auto">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="flex flex-row items-center gap-2">
								<Download className="size-4" />
								{isDownloading ? "Downloading..." : "Download"}
							</DropdownMenuLabel>
							{downloadSources.length > 0 ? (
								downloadSources.map((source) => (
									<DropdownMenuSub key={source.key}>
										<DropdownMenuSubTrigger>
											{source.label}
										</DropdownMenuSubTrigger>
										<DropdownMenuPortal>
											<DropdownMenuSubContent>
												{source.variants.map((variant) => (
													<DropdownMenuItem
														key={variant.value}
														onClick={(event) => {
															event.stopPropagation();
															void handleDownload(variant.value);
														}}
														disabled={isDownloading}
													>
														<div className="flex w-full items-center justify-between gap-4">
															<span>{variant.label}</span>
															{variant.meta ? (
																<span className="text-xs text-muted-foreground">
																	{variant.meta}
																</span>
															) : null}
														</div>
													</DropdownMenuItem>
												))}
											</DropdownMenuSubContent>
										</DropdownMenuPortal>
									</DropdownMenuSub>
								))
							) : (
								<DropdownMenuItem disabled>No files available</DropdownMenuItem>
							)}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
