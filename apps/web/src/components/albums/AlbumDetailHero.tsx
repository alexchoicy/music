import {
	Disc3Icon,
	EllipsisVertical,
	ListPlusIcon,
	PlayIcon,
} from "lucide-react";
import pmap from "p-map";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";
import { getPresignedDownloadUrl } from "#/store/audioPlayer/audioPlayerFunction";

import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "../coss/menu";
import { toastManager } from "../coss/toast";
import { getAlbumHoverCoverUrl, getCreditNames } from "./albumDetailUtils";
import type { AlbumDetails } from "./albumDetailUtils";

type AlbumDownloadFile = {
	url: string;
	extension: string;
};

type AlbumDownloadType = "source" | "tagged" | "opus";
type AlbumAudioFile =
	AlbumDetails["discs"][number]["tracks"][number]["audios"][number]["file"];

type AlbumDownloadTrack = {
	fileName: string;
	url: string;
};

function normalizeFileName(fileName: string) {
	return (
		Array.from(fileName.normalize("NFKC"))
			.filter((char) => char >= " ")
			.join("")
			.replace(/[<>:"/\\|?*]/g, "-")
			.replace(/\s+/g, " ")
			.replace(/[. ]+$/g, "")
			.slice(0, 240) || "track"
	);
}

function getDownloadLabel(fileType: AlbumDownloadType) {
	switch (fileType) {
		case "source":
			return "source";
		case "tagged":
			return "tagged original";
		case "opus":
			return "opus";
	}
}

function getDownloadFile(
	file: AlbumAudioFile,
	fileType: AlbumDownloadType,
): AlbumDownloadFile | undefined {
	switch (fileType) {
		case "source":
			return file.original;
		case "tagged":
			return file.taggedOriginal!;
		case "opus":
			return file.opus96!;
	}
}

type AlbumDetailHeroProps = {
	album: AlbumDetails;
	onPlayAlbum: () => void;
	onAddToQueue: () => void;
	playAlbumDisabled?: boolean;
};

export function AlbumDetailHero({
	album,
	onPlayAlbum,
	onAddToQueue,
	playAlbumDisabled,
}: AlbumDetailHeroProps) {
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const hoverCoverUrl = getAlbumHoverCoverUrl(album);
	const artistNames = getCreditNames(album.credits) || "Unknown artist";
	const duration =
		formatDurationInHoursMinutesSeconds(album.totalDurationInMs) ?? "0s";
	const releaseDate = formatDate(album.releaseDate);

	async function downloadAlbum(fileType: AlbumDownloadType) {
		const presignUrls: AlbumDownloadTrack[] = [];

		for (const disc of album.discs) {
			for (const track of disc.tracks) {
				const pinAudio = track.audios.find((audio) => audio.pinned);
				if (!pinAudio) continue;

				const file = getDownloadFile(pinAudio.file, fileType);
				const label = getDownloadLabel(fileType);

				if (!file) {
					toastManager.add({
						title: `No ${label} available`,
						description: `${track.title} has no ${label} URL available`,
						type: "error",
					});
					continue;
				}

				const presign = await getPresignedDownloadUrl(file.url);
				if (!presign) {
					toastManager.add({
						title: `No ${label} available`,
						description: `${track.title} has no ${label} URL available`,
						type: "error",
					});
					continue;
				}

				presignUrls.push({
					fileName: normalizeFileName(
						`${disc.discNumber} - ${track.trackNumber} ${track.title}.${file.extension}`,
					),
					url: presign,
				});
			}
		}

		if (presignUrls.length === 0) return;

		const toastId = toastManager.add({
			title: "Preparing download",
			description: `0/${presignUrls.length} tracks downloaded.`,
			type: "loading",
		});

		try {
			const { total } = await download(presignUrls, (done, count, fileName) => {
				toastManager.update(toastId, {
					title: "Downloading album",
					description: `${done}/${count} saved: ${fileName}`,
					type: "loading",
				});
			});

			toastManager.update(toastId, {
				title: "Download successful",
				description: `${total} tracks downloaded.`,
				type: "success",
			});
		} catch (error) {
			toastManager.update(toastId, {
				title: "Download failed",
				description:
					error instanceof Error ? error.message : "Something went wrong.",
				type: "error",
			});
		}
	}

	async function download(
		presignUrls: AlbumDownloadTrack[],
		onProgress: (done: number, total: number, fileName: string) => void,
	) {
		let total = 0;

		if ("showDirectoryPicker" in window) {
			const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
			await pmap(
				presignUrls,
				async (track) => {
					const res = await fetch(track.url);
					if (!res.ok) throw new Error(`Failed to download ${track.fileName}`);
					const data = await res.arrayBuffer();
					const fileHandle = await dirHandle.getFileHandle(track.fileName, {
						create: true,
					});
					const writable = await fileHandle.createWritable();
					await writable.write(data);
					await writable.close();
					total += 1;
					onProgress(total, presignUrls.length, track.fileName);
				},
				{ concurrency: 5 },
			);
		} else {
			for (const track of presignUrls) {
				const iframe = document.createElement("iframe");
				iframe.style.display = "none";
				iframe.src = track.url;

				document.body.appendChild(iframe);
				setTimeout(() => iframe.remove(), 5 * 60 * 1000);
				total += 1;
				onProgress(total, presignUrls.length, track.fileName);
			}
		}

		return { total };
	}

	return (
		<section className="flex flex-col gap-5 md:flex-row md:items-end">
			<div
				className="aspect-square w-48 shrink-0 overflow-hidden rounded-2xl border bg-muted shadow-sm/5 [perspective:1200px] sm:w-56 md:w-64"
				data-slot="album-hero-cover"
			>
				{coverUrl ? (
					hoverCoverUrl ? (
						<div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] in-[[data-slot=album-hero-cover]:hover]:[transform:rotateY(180deg)]">
							<img
								alt={`${album.title} album cover`}
								className="absolute inset-0 h-full w-full object-cover [backface-visibility:hidden]"
								src={coverUrl}
							/>
							<img
								alt={`${album.title} alternate album cover`}
								className="absolute inset-0 h-full w-full [transform:rotateY(180deg)] object-cover [backface-visibility:hidden]"
								src={hoverCoverUrl}
							/>
						</div>
					) : (
						<img
							alt={`${album.title} album cover`}
							className="h-full w-full object-cover"
							src={coverUrl}
						/>
					)
				) : (
					<div className="flex h-full w-full items-center justify-center text-muted-foreground">
						<Disc3Icon aria-hidden="true" className="size-14" />
					</div>
				)}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<Badge className="w-fit" variant="secondary">
						{album.type}
					</Badge>
					<h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
						{album.title}
					</h1>
					<p className="text-base text-muted-foreground">{artistNames}</p>
					<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						{releaseDate && (
							<>
								<span>{releaseDate}</span>
								<span aria-hidden="true">&middot;</span>
							</>
						)}
						<span>
							{album.totalTrackCount} track
							{Number(album.totalTrackCount) === 1 ? "" : "s"}
						</span>
						<span aria-hidden="true">&middot;</span>
						<span>{duration}</span>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button disabled={playAlbumDisabled} onClick={onPlayAlbum}>
						<PlayIcon aria-hidden="true" />
						Play Album
					</Button>
					<Menu>
						<MenuTrigger
							render={
								<Button variant="outline">
									<EllipsisVertical />
								</Button>
							}
						/>
						<MenuPopup align="start">
							<MenuGroup>
								<MenuGroupLabel>Playback</MenuGroupLabel>
								<MenuItem onClick={onAddToQueue}>
									<ListPlusIcon aria-hidden="true" />
									Add to queue
								</MenuItem>
							</MenuGroup>
							<MenuSeparator />
							<MenuGroup>
								<MenuGroupLabel>Download</MenuGroupLabel>
								<MenuItem onClick={() => downloadAlbum("source")}>
									Source Files
								</MenuItem>
								<MenuItem onClick={() => downloadAlbum("tagged")}>
									Source Tagged Files
								</MenuItem>
								<MenuItem onClick={() => downloadAlbum("opus")}>Opus</MenuItem>
							</MenuGroup>
						</MenuPopup>
					</Menu>
				</div>
			</div>
		</section>
	);
}
