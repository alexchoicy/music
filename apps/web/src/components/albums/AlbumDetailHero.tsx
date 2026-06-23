import {
	ChevronDownIcon,
	Disc3Icon,
	Download,
	DownloadIcon,
	EllipsisVertical,
	ListPlusIcon,
	Option,
	PlayIcon,
} from "lucide-react";
import pMap from "p-map";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";
import { getPresignedUrl } from "#/store/audioPlayer/audioPlayerFunction";

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

	async function downloadAlbum(fileType: "source" | "tagged" | "opus") {
		const presignUrls: { fileName: string; url: string }[] = [];

		for (const disc of album.discs) {
			for (const track of disc.tracks) {
				const pinAudio = track.audios.find((audio) => audio.pinned);
				if (!pinAudio) continue;

				switch (fileType) {
					case "source": {
						const presign = await getPresignedUrl(pinAudio.file.original.url);
						if (!presign) {
							toastManager.add({
								title: "No source available",
								description: `${track.title} has no source URL available`,
								type: "error",
							});
							continue;
						}
						presignUrls.push({
							fileName: `${disc.discNumber} - ${track.trackNumber} ${track.title}.${pinAudio.file.original.extension}`,
							url: presign,
						});

						break;
					}
					case "tagged": {
						if (!pinAudio.file.taggedOriginal) {
							toastManager.add({
								title: "No tagged original available",
								description: `${track.title} has no tagged original URL available`,
								type: "error",
							});
							continue;
						}
						const presign = await getPresignedUrl(
							pinAudio.file.taggedOriginal.url,
						);
						if (!presign) {
							toastManager.add({
								title: "No tagged original available",
								description: `${track.title} has no tagged original URL available`,
								type: "error",
							});
							continue;
						}
						presignUrls.push({
							fileName: `${disc.discNumber} - ${track.trackNumber} ${track.title}.${pinAudio.file.taggedOriginal.extension}`,
							url: presign,
						});
						break;
					}
					case "opus": {
						if (!pinAudio.file.opus96) {
							toastManager.add({
								title: "No opus available",
								description: `${track.title} has no opus URL available`,
								type: "error",
							});
							continue;
						}
						const presign = await getPresignedUrl(pinAudio.file.opus96.url);
						if (!presign) {
							toastManager.add({
								title: "No opus available",
								description: `${track.title} has no opus URL available`,
								type: "error",
							});
							continue;
						}
						presignUrls.push({
							fileName: `${disc.discNumber} - ${track.trackNumber} ${track.title}.${pinAudio.file.opus96.extension}`,
							url: presign,
						});
					}
				}
			}
		}
		await toastManager.promise(downloadAlbumZip(fileType, presignUrls), {
			loading: {
				title: "Preparing download",
				description: "Fetching tracks and building your ZIP...",
			},
			success: ({ zipName, total }) => ({
				title: "Download ready",
				description: `${total} tracks downloaded as ${zipName}.`,
			}),
			error: (error) => ({
				title: "Download failed",
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			}),
		});
	}

	async function downloadAlbumZip(
		fileType: "source" | "tagged" | "opus",
		presignUrls: { fileName: string; url: string }[],
	) {
		const zipName = `${album.title}-${fileType}.zip`;
		const JSZip = (await import("jszip")).default;

		const zip = new JSZip();
		const total = presignUrls.length;
		let loaded = 0;

		await pMap(
			presignUrls,
			async (track) => {
				const res = await fetch(track.url);

				if (!res.ok) {
					throw new Error(`Failed to fetch ${track.fileName}`);
				}

				const data = await res.arrayBuffer();
				zip.file(track.fileName, data);

				loaded++;
			},
			{ concurrency: 3 },
		);

		const zipBlob = await zip.generateAsync({ type: "blob" });

		const objectUrl = URL.createObjectURL(zipBlob);
		const a = document.createElement("a");
		a.href = objectUrl;
		a.download = zipName;
		a.rel = "noopener noreferrer";
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(objectUrl);

		return { zipName, total };
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
