import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Disc3Icon, PlayIcon } from "lucide-react";

import { AlbumContextMenu } from "#/components/album/AlbumContextMenu";
import { AlbumTypeBadge } from "#/components/album/AlbumTypeBadge";
import { Button } from "#/components/base/button";
import type { components } from "#/data/APIschema";
import { useTitleLang } from "#/hooks/use-title-lang";
import { albumQueries } from "#/lib/queries/album.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type Album = components["schemas"]["AlbumListItem"];

type AlbumTileProps = {
	album: Album;
	className?: string;
	showMeta?: boolean;
};

export function AlbumTile({
	album,
	className,
	showMeta = true,
}: AlbumTileProps) {
	const queryClient = useQueryClient();
	const titleLang = useTitleLang();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const isPlaying = useAudioPlayerStore(
		(state) =>
			state.status === "playing" &&
			state.queue.at(state.index)?.albumId === String(album.albumId),
	);

	// Same cover as the album page; disc 1's cover only when the album has none.
	const coverUrl =
		getAlbumCoverUrl(album.coverVariants) ??
		getAlbumCoverUrl(album.discCovers?.[0]?.variants);
	const artistNames =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";
	const trackCount = Number(album.trackCount);
	const meta = [
		`${trackCount} ${trackCount === 1 ? "track" : "tracks"}`,
		formatDurationInHoursAndMinutes(album.totalDurationInMs),
	]
		.filter(Boolean)
		.join(" · ");

	async function play() {
		const details = await queryClient.ensureQueryData(
			albumQueries.getAlbum(album.albumId),
		);
		playAlbum(albumDetailsToAudioPlayerTracks(details));
	}

	return (
		<AlbumContextMenu
			album={album}
			className={cn(
				"group/tile @container relative flex min-w-0 flex-col gap-3",
				className,
			)}
		>
			<div className="relative aspect-square w-full transition-transform duration-150 ease-out group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
				<div className="absolute inset-0 overflow-hidden rounded-xl bg-muted">
					{coverUrl ? (
						<img
							alt=""
							className="size-full object-cover"
							loading="lazy"
							src={coverUrl}
						/>
					) : (
						<span className="flex size-full items-center justify-center text-muted-foreground">
							<Disc3Icon aria-hidden="true" className="size-10" />
						</span>
					)}
					<span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />
				</div>
				{isPlaying && (
					<span className="pointer-events-none absolute inset-0 rounded-xl shadow-glow-primary" />
				)}
				{album.type !== "Album" && (
					<AlbumTypeBadge
						className="absolute top-2 left-2 max-w-[calc(100%-1rem)]"
						surface="artwork"
						type={album.type}
					/>
				)}
				<span className="absolute right-2 bottom-2 z-10 opacity-0 transition-[opacity,translate] duration-150 group-hover/tile:opacity-100 focus-within:opacity-100 motion-safe:translate-y-1 motion-safe:group-hover/tile:translate-y-0 motion-safe:focus-within:translate-y-0">
					<Button
						aria-label={`Play ${album.title}`}
						onClick={() => void play()}
						size="icon-xl"
						variant="play"
					>
						<PlayIcon aria-hidden="true" className="size-4" />
					</Button>
				</span>
			</div>

			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-1.5">
					{isPlaying && <PlayingBars />}
					<Link
						className={cn(
							"truncate text-sm font-semibold outline-none",
							"after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring",
							isPlaying && "text-primary",
						)}
						lang={titleLang(album.languageId)}
						params={{ id: String(album.albumId) }}
						title={album.title}
						to="/albums/$id"
					>
						{album.title}
					</Link>
				</div>
				<span
					className="truncate text-xs text-muted-foreground"
					title={artistNames}
				>
					{artistNames}
				</span>
				{showMeta && (
					<span className="mt-1 truncate text-xs text-muted-foreground">
						{meta}
					</span>
				)}
			</div>
		</AlbumContextMenu>
	);
}

export function PlayingBars() {
	return (
		<span aria-hidden="true" className="flex h-3 shrink-0 items-end gap-0.5">
			<span className="h-[7px] w-0.5 rounded-[1px] bg-primary" />
			<span className="h-3 w-0.5 rounded-[1px] bg-primary" />
			<span className="h-[9px] w-0.5 rounded-[1px] bg-primary" />
		</span>
	);
}
