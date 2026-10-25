import type * as API from "@music/api";
import { CheckIcon, CopyIcon, DownloadIcon, FilmIcon } from "lucide-react";
import { useState } from "react";

import { PlayingBars } from "#/components/album/AlbumTile";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import { toastManager } from "#/components/base/toast";
import { CONCERT_FILE_TYPE } from "#/enums/concertEnums";
import { formatMsToMMSSOrHMMSS } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import {
	getPresignedDownloadUrl,
	getPresignedUrl,
} from "#/store/audioPlayer/audioPlayerFunction";

type ConcertFile = API.ConcertFileDetails;
type ConcertFileType = ConcertFile["type"];

const FILE_TYPE_ORDER: ConcertFileType[] = [
	"Performance",
	"BehindTheScenes",
	"Extra",
	"Other",
];

type ConcertFileListProps = {
	files: ConcertFile[];
	currentFileId: ConcertFile["concertFileId"] | null;
	isPlaying: boolean;
	onSelectFile: (file: ConcertFile) => void;
};

export function ConcertFileList({
	files,
	currentFileId,
	isPlaying,
	onSelectFile,
}: ConcertFileListProps) {
	const groups = FILE_TYPE_ORDER.map((type) => ({
		type,
		files: files.filter((file) => file.type === type),
	})).filter((group) => group.files.length > 0);

	return (
		<aside
			aria-labelledby="concert-files"
			className="flex min-w-0 flex-col gap-4"
		>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-xl font-semibold tracking-tight" id="concert-files">
					Files
				</h2>
				<span className="text-xs font-medium text-muted-foreground tabular-nums">
					{files.length}
				</span>
			</div>

			{groups.map((group) => (
				<section
					aria-label={CONCERT_FILE_TYPE[group.type]}
					className="flex flex-col gap-0.5"
					key={group.type}
				>
					<h3 className="px-2 pb-1.5 text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">
						{CONCERT_FILE_TYPE[group.type]}
					</h3>
					{group.files.map((file) => (
						<ConcertFileRow
							file={file}
							isCurrent={file.concertFileId === currentFileId}
							isPlaying={isPlaying}
							key={file.concertFileId}
							onSelect={() => onSelectFile(file)}
						/>
					))}
				</section>
			))}
		</aside>
	);
}

function ConcertFileRow({
	file,
	isCurrent,
	isPlaying,
	onSelect,
}: {
	file: ConcertFile;
	isCurrent: boolean;
	isPlaying: boolean;
	onSelect: () => void;
}) {
	const [copied, setCopied] = useState(false);
	const original = file.file.original;
	const thumbnail =
		file.file.attachedPicture?.url ?? file.file.thumbnail640x360?.url;
	const isDash = file.file.dashAV1 != null;
	const meta = [
		formatMsToMMSSOrHMMSS(Number(original.durationInMs ?? 0)),
		original.width != null && original.height != null
			? `${original.width}×${original.height}`
			: null,
	]
		.filter(Boolean)
		.join(" · ");

	async function copyUrl() {
		const url = await getPresignedUrl(original.url);
		if (!url) {
			toastManager.add({ title: "Could not copy the URL", type: "error" });
			return;
		}
		await navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	async function download() {
		const url = await getPresignedDownloadUrl(original.url);
		if (!url) {
			toastManager.add({
				title: "Could not start the download",
				type: "error",
			});
			return;
		}
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.click();
	}

	return (
		<div
			className={cn(
				"group/file relative flex flex-col rounded-lg p-2 transition-colors duration-150 hover:bg-accent motion-reduce:transition-none",
			)}
		>
			<button
				aria-current={isCurrent ? "true" : undefined}
				aria-label={`Play ${file.title}`}
				className="flex min-w-0 cursor-pointer items-start gap-3 text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
				onClick={onSelect}
				type="button"
			>
				<span className="artwork-edge relative flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground shadow-card">
					{thumbnail ? (
						<img alt="" className="size-full object-cover" src={thumbnail} />
					) : (
						<FilmIcon aria-hidden="true" className="size-5" />
					)}
					{isCurrent && isPlaying && (
						<span className="absolute inset-0 flex items-center justify-center bg-background/70">
							<PlayingBars />
						</span>
					)}
				</span>
				<span className="flex min-w-0 flex-col gap-0.5 pe-16">
					<span
						className={cn(
							"line-clamp-2 text-sm font-semibold",
							isCurrent && "text-primary",
						)}
					>
						{file.title}
					</span>
					<span className="text-xs font-medium text-muted-foreground tabular-nums">
						{meta}
					</span>
				</span>
			</button>

			<Badge
				className="absolute end-2 top-2"
				variant={isDash ? "success" : "secondary"}
			>
				{isDash ? "DASH" : "Original"}
			</Badge>

			<div
				className={cn(
					"grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,padding] duration-200 group-focus-within/file:grid-rows-[1fr] group-focus-within/file:pt-2 group-focus-within/file:opacity-100 group-hover/file:grid-rows-[1fr] group-hover/file:pt-2 group-hover/file:opacity-100 motion-reduce:transition-none",
					isCurrent && "grid-rows-[1fr] pt-2 opacity-100",
				)}
			>
				<div className="relative z-10 flex min-h-0 gap-2 overflow-hidden">
					<Button
						className="flex-1"
						onClick={() => void copyUrl()}
						size="xs"
						variant="secondary"
					>
						{copied ? (
							<CheckIcon aria-hidden="true" />
						) : (
							<CopyIcon aria-hidden="true" />
						)}
						{copied ? "Copied" : "Copy URL"}
					</Button>
					<Button
						className="flex-1"
						onClick={() => void download()}
						size="xs"
						variant="secondary"
					>
						<DownloadIcon aria-hidden="true" />
						Download
					</Button>
				</div>
			</div>
		</div>
	);
}
