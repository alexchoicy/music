import {
	CheckIcon,
	ClockIcon,
	CopyIcon,
	DownloadIcon,
	FilmIcon,
} from "lucide-react";
import type { MouseEvent } from "react";
import { useState } from "react";

import { Button, buttonVariants } from "#/components/coss/button";
import type { components } from "#/data/APIschema";
import { formatMsToTimer } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { getPresignedUrl } from "#/store/audioPlayer/audioPlayerFunction";

type ConcertFile = components["schemas"]["ConcertFileDetails"];

type ConcertFileCardProps = {
	file: ConcertFile;
	isCurrentPlaying: boolean;
	onSelect: () => void;
};

export function ConcertFileCard({
	file,
	isCurrentPlaying,
	onSelect,
}: ConcertFileCardProps) {
	const thumbnail =
		file.file.attachedPicture?.url || file.file.thumbnail640x360?.url;
	const original = file.file.original;
	const durationLabel = formatMsToTimer(Number(original.durationInMs ?? 0));
	const hasDash = file.file.dashAV1 != null;
	const hasResolution = original.width != null && original.height != null;
	const originalUrl = original.url;

	const [copied, setCopied] = useState(false);

	const handleCopyUrl = async () => {
		try {
			const url = await getPresignedUrl(originalUrl);
			if (!url) return;

			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {}
	};

	const handleDownload = async (event: MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault();

		const url = await getPresignedUrl(originalUrl);
		if (!url) return;

		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "";
		anchor.rel = "noreferrer";
		anchor.target = "_blank";
		anchor.click();
	};

	return (
		<div
			className={cn(
				"group/card rounded-xl border transition-colors",
				isCurrentPlaying
					? "border-primary/40 bg-primary/5"
					: "border-border bg-card hover:border-primary/30",
			)}
			data-slot="concert-file-card"
		>
			<button
				className="flex w-full items-start gap-3 p-3 text-left"
				onClick={onSelect}
				type="button"
			>
				<div
					className={cn(
						"flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg",
						isCurrentPlaying ? "bg-primary/15" : "bg-muted",
					)}
				>
					{thumbnail ? (
						<img alt="" className="size-full object-cover" src={thumbnail} />
					) : (
						<FilmIcon
							aria-hidden="true"
							className={cn(
								"size-5",
								isCurrentPlaying ? "text-primary" : "text-muted-foreground",
							)}
						/>
					)}
				</div>

				<div className="min-w-0 flex-1">
					<p
						className={cn(
							"truncate text-sm leading-snug font-medium",
							isCurrentPlaying ? "text-primary" : "text-foreground",
						)}
					>
						{file.title}
					</p>

					<div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						{durationLabel && (
							<span className="flex items-center gap-0.5">
								<ClockIcon aria-hidden="true" className="size-3" />
								{durationLabel}
							</span>
						)}
						{hasResolution && (
							<span className="tabular-nums">
								{original.width}×{original.height}
							</span>
						)}
					</div>

					<div className="mt-1.5">
						<span
							className={cn(
								"rounded px-1.5 py-0.5 text-[10px] font-semibold",
								hasDash
									? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
									: "bg-secondary text-muted-foreground",
							)}
						>
							{hasDash ? "DASH" : "Original"}
						</span>
					</div>
				</div>
			</button>

			<div
				className={cn(
					"grid grid-rows-[0fr] px-3 opacity-0 transition-[grid-template-rows,opacity,padding] duration-200 group-focus-within/card:grid-rows-[1fr] group-focus-within/card:pb-3 group-focus-within/card:opacity-100 group-hover/card:grid-rows-[1fr] group-hover/card:pb-3 group-hover/card:opacity-100",
					isCurrentPlaying && "grid-rows-[1fr] pb-3 opacity-100",
				)}
			>
				<div className="flex min-h-0 gap-2 overflow-hidden">
					<Button
						className={cn(
							"flex-1",
							copied
								? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
								: "text-muted-foreground hover:border-primary/40 hover:text-foreground",
						)}
						onClick={handleCopyUrl}
						size="xs"
						variant="secondary"
					>
						{copied ? (
							<>
								<CheckIcon aria-hidden="true" />
								Copied
							</>
						) : (
							<>
								<CopyIcon aria-hidden="true" />
								Copy URL
							</>
						)}
					</Button>
					<a
						className={cn(
							buttonVariants({ size: "xs", variant: "secondary" }),
							"flex-1 text-muted-foreground hover:border-primary/40 hover:text-foreground",
						)}
						onClick={handleDownload}
					>
						<DownloadIcon aria-hidden="true" />
						Download
					</a>
				</div>
			</div>
		</div>
	);
}
