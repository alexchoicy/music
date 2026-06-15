import { Link } from "@tanstack/react-router";
import { Disc3Icon } from "lucide-react";

import { Badge } from "#/components/coss/badge";
import {
	Card,
	CardDescription,
	CardPanel,
	CardTitle,
} from "#/components/coss/card";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "#/components/coss/tooltip";
import type { components } from "#/data/APIschema";
import { getCoverUrl } from "#/lib/utils/album";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";

type Album = components["schemas"]["AlbumListItem"];

type AlbumCardProps = {
	album: Album;
};

export function AlbumCard({ album }: AlbumCardProps) {
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	const discCoverUrls: string[] = [];

	for (const discCover of album.discCovers ?? []) {
		const coverUrl = getCoverUrl(discCover.variants);
		if (coverUrl) discCoverUrls.push(coverUrl);
	}

	const primaryCoverUrl = discCoverUrls[0] ?? getCoverUrl(album.coverVariants);

	const hoverCoverUrl = discCoverUrls[1];

	const durationLabel =
		formatDurationInHoursAndMinutes(album.totalDurationInMs) ?? "0m";

	return (
		<div data-slot="album-card">
			<Link
				className="block h-full rounded-2xl text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				params={{ id: String(album.albumId) }}
				to="/albums/$id"
			>
				<Card className="h-full overflow-hidden transition-shadow in-[[data-slot=album-card]:hover]:shadow-md">
					<div className="relative aspect-square overflow-hidden bg-muted [perspective:1200px]">
						{primaryCoverUrl ? (
							hoverCoverUrl ? (
								<div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] in-[[data-slot=album-card]:hover]:[transform:rotateY(180deg)]">
									<img
										alt={`${album.title} album cover`}
										className="absolute inset-0 h-full w-full object-cover [backface-visibility:hidden]"
										src={primaryCoverUrl}
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
									className="h-full w-full object-cover transition-transform duration-300 in-[[data-slot=album-card]:hover]:scale-105"
									src={primaryCoverUrl}
								/>
							)
						) : (
							<div className="flex h-full w-full items-center justify-center text-muted-foreground">
								<Disc3Icon aria-hidden="true" className="size-12" />
							</div>
						)}

						<Badge className="absolute top-3 right-3 bg-card/85 text-card-foreground shadow-sm backdrop-blur-sm">
							{album.type}
						</Badge>
					</div>

					<CardPanel className="flex flex-col gap-3 p-4">
						<div className="flex min-w-0 flex-col gap-1">
							<Tooltip>
								<TooltipTrigger
									render={
										<CardTitle className="truncate text-base" render={<h2 />} />
									}
								>
									{album.title}
								</TooltipTrigger>
								<TooltipPopup className="max-w-72">{album.title}</TooltipPopup>
							</Tooltip>
							<CardDescription className="truncate">
								{artistNames}
							</CardDescription>
						</div>

						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
							<span>
								{album.trackCount} track{album.trackCount === 1 ? "" : "s"}
							</span>
							<span aria-hidden="true">&middot;</span>
							<span>{durationLabel}</span>
						</div>
					</CardPanel>
				</Card>
			</Link>
		</div>
	);
}
