import {
	ChevronDownIcon,
	Disc3Icon,
	DownloadIcon,
	PlayIcon,
} from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";

import {
	getAlbumCoverUrl,
	getAlbumHoverCoverUrl,
	getCreditNames,
} from "./albumDetailUtils";
import type { AlbumDetails } from "./albumDetailUtils";

type AlbumDetailHeroProps = {
	album: AlbumDetails;
};

export function AlbumDetailHero({ album }: AlbumDetailHeroProps) {
	const coverUrl = getAlbumCoverUrl(album);
	const hoverCoverUrl = getAlbumHoverCoverUrl(album);
	const artistNames = getCreditNames(album.credits) || "Unknown artist";
	const duration =
		formatDurationInHoursMinutesSeconds(album.totalDurationInMs) ?? "0s";
	const releaseDate = formatDate(album.releaseDate);

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
					<Button>
						<PlayIcon aria-hidden="true" />
						Play Album
					</Button>
					<Button variant="outline">
						<DownloadIcon aria-hidden="true" />
						Download
						<ChevronDownIcon aria-hidden="true" />
					</Button>
				</div>
			</div>
		</section>
	);
}
