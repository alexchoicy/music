import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Disc3Icon, PlayIcon } from "lucide-react";
import { useRef } from "react";

import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
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
import { albumQueries } from "#/lib/queries/album.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type Album = components["schemas"]["AlbumListItem"];

type AlbumCardProps = {
	album: Album;
	className?: string;
};

export function AlbumCard({ album, className }: AlbumCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	const discCoverUrls: string[] = [];

	for (const discCover of album.discCovers ?? []) {
		const coverUrl = getAlbumCoverUrl(discCover.variants);
		if (coverUrl) discCoverUrls.push(coverUrl);
	}

	const primaryCoverUrl =
		discCoverUrls[0] ?? getAlbumCoverUrl(album.coverVariants);

	const hoverCoverUrl = discCoverUrls[1];

	const durationLabel =
		formatDurationInHoursAndMinutes(album.totalDurationInMs) ?? "0m";

	async function playCardAlbum() {
		const albumDetails = await queryClient.ensureQueryData(
			albumQueries.getAlbum(album.albumId),
		);
		playAlbum(albumDetailsToAudioPlayerTracks(albumDetails));
	}

	useHotkey("G", () => {
		if (
			document.activeElement instanceof HTMLElement &&
			cardRef.current?.contains(document.activeElement)
		) {
			void playCardAlbum();
		}
	});

	return (
		<div
			className={cn("[container-type:inline-size] relative", className)}
			data-slot="album-card"
			ref={cardRef}
		>
			<Button
				aria-label={`Play ${album.title}`}
				className="absolute top-[calc(100cqw-2.75rem)] right-3 z-10 opacity-0 shadow-sm transition-opacity in-[[data-slot=album-card]:focus-within]:opacity-100 in-[[data-slot=album-card]:hover]:opacity-100"
				onClick={() => {
					void playCardAlbum();
				}}
				size="icon-sm"
				type="button"
			>
				<PlayIcon aria-hidden="true" />
			</Button>
			<Link
				className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

						<Badge className="absolute end-3 top-3 bg-card/85 text-card-foreground shadow-sm backdrop-blur-sm">
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
							<Tooltip>
								<TooltipTrigger
									render={<CardDescription className="truncate" />}
								>
									{artistNames}
								</TooltipTrigger>
								<TooltipPopup className="max-w-72">{artistNames}</TooltipPopup>
							</Tooltip>
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
