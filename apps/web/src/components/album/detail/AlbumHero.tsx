import { Link } from "@tanstack/react-router";
import {
	Disc3Icon,
	DownloadIcon,
	EllipsisIcon,
	ListMusicIcon,
	ListPlusIcon,
	PencilIcon,
	PlayIcon,
	Share2Icon,
} from "lucide-react";

import {
	downloadAlbum,
	getAlbumHoverCoverUrl,
	shareAlbumLink,
} from "#/components/album/detail/albumDetail";
import type { AlbumDetails } from "#/components/album/detail/albumDetail";
import { Button } from "#/components/base/button";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "#/components/base/menu";
import { PartyContextMenu } from "#/components/party/PartyContextMenu";
import { useTitleLang } from "#/hooks/use-title-lang";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";

type AlbumHeroProps = {
	album: AlbumDetails;
	canEdit: boolean;
	canPlay: boolean;
	onPlay: () => void;
	onAddToQueue: () => void;
	onAddToPlaylist: () => void;
};

export function AlbumHero({
	album,
	canEdit,
	canPlay,
	onPlay,
	onAddToQueue,
	onAddToPlaylist,
}: AlbumHeroProps) {
	const titleLang = useTitleLang();
	const coverUrl = getAlbumCoverUrl(album.cover.album);
	const hoverCoverUrl = getAlbumHoverCoverUrl(album);
	const trackCount = Number(album.totalTrackCount);
	const meta = [
		formatDate(album.releaseDate),
		`${trackCount} ${trackCount === 1 ? "track" : "tracks"}`,
		formatDurationInHoursMinutesSeconds(album.totalDurationInMs) ?? "0s",
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<section className="flex flex-wrap items-end gap-6 sm:gap-8">
			<div
				className="group/cover relative size-40 shrink-0 overflow-hidden rounded-4xl bg-muted shadow-pop [perspective:1200px] sm:size-60"
				data-slot="album-hero-cover"
			>
				{coverUrl ? (
					hoverCoverUrl ? (
						<div className="relative size-full transition-transform duration-300 ease-out [transform-style:preserve-3d] group-hover/cover:[transform:rotateY(180deg)] motion-reduce:transition-none">
							<img
								alt={`${album.title} album cover`}
								className="absolute inset-0 size-full object-cover [backface-visibility:hidden]"
								src={coverUrl}
							/>
							<img
								alt={`${album.title} alternate album cover`}
								className="absolute inset-0 size-full [transform:rotateY(180deg)] object-cover [backface-visibility:hidden]"
								src={hoverCoverUrl}
							/>
						</div>
					) : (
						<img
							alt={`${album.title} album cover`}
							className="size-full object-cover"
							src={coverUrl}
						/>
					)
				) : (
					<span className="flex size-full items-center justify-center text-muted-foreground">
						<Disc3Icon aria-hidden="true" className="size-14" />
					</span>
				)}
			</div>

			<div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-4">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">
						{album.type}
					</p>
					<h1
						className="text-3xl font-bold tracking-[-.03em] break-words select-text lg:text-5xl lg:leading-[52px]"
						lang={titleLang(album.languageId)}
					>
						{album.title}
					</h1>
					<p className="text-base text-muted-foreground select-text">
						{album.credits.length > 0
							? album.credits.map((credit, index) => (
									<span key={`${credit.partyId}-${credit.creditType}`}>
										{index > 0 && ", "}
										<PartyContextMenu
											party={credit}
											render={
												<Link
													className="rounded-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
													params={{ id: String(credit.partyId) }}
													to="/parties/$id"
												/>
											}
										>
											{credit.name}
										</PartyContextMenu>
									</span>
								))
							: "Unknown artist"}
					</p>
					<p className="text-xs text-muted-foreground select-text">{meta}</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button disabled={!canPlay} onClick={onPlay} size="lg">
						<PlayIcon aria-hidden="true" />
						Play album
					</Button>
					<Button
						aria-label="Add to queue"
						disabled={!canPlay}
						onClick={onAddToQueue}
						size="icon-lg"
						variant="secondary"
					>
						<ListPlusIcon aria-hidden="true" />
					</Button>
					<Button
						aria-label="Share album"
						onClick={() => void shareAlbumLink(album)}
						size="icon-lg"
						variant="secondary"
					>
						<Share2Icon aria-hidden="true" />
					</Button>
					<Menu>
						<MenuTrigger
							render={
								<Button
									aria-label="More actions"
									size="icon-lg"
									variant="secondary"
								/>
							}
						>
							<EllipsisIcon aria-hidden="true" />
						</MenuTrigger>
						<MenuPopup align="start">
							<MenuItem disabled={trackCount === 0} onClick={onAddToPlaylist}>
								<ListMusicIcon aria-hidden="true" />
								Add to playlist
							</MenuItem>
							<MenuSeparator />
							<MenuGroup>
								<MenuGroupLabel>Download</MenuGroupLabel>
								<MenuItem onClick={() => void downloadAlbum(album, "source")}>
									<DownloadIcon aria-hidden="true" />
									Source files
								</MenuItem>
								<MenuItem onClick={() => void downloadAlbum(album, "tagged")}>
									<DownloadIcon aria-hidden="true" />
									Source tagged files
								</MenuItem>
								<MenuItem onClick={() => void downloadAlbum(album, "opus")}>
									<DownloadIcon aria-hidden="true" />
									Opus
								</MenuItem>
							</MenuGroup>
						</MenuPopup>
					</Menu>
					{canEdit && (
						<Button
							render={
								<Link
									params={{ id: String(album.albumId) }}
									to="/albums/$id/edit"
								/>
							}
							size="lg"
							variant="outline"
						>
							<PencilIcon aria-hidden="true" />
							Edit album
						</Button>
					)}
				</div>
			</div>
		</section>
	);
}
