import { useHotkey } from "@tanstack/react-hotkeys";
import {
	CopyIcon,
	DownloadIcon,
	EllipsisIcon,
	ListEndIcon,
	ListMusicIcon,
	ListStartIcon,
	PlayIcon,
	Share2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	downloadTrackFile,
	getContentTypeLabel,
	getCreditNames,
	shareAlbumLink,
} from "#/components/album/detail/albumDetail";
import type {
	AlbumDetails,
	AlbumTrack,
} from "#/components/album/detail/albumDetail";
import { copyText } from "#/components/app/copyText";
import { Badge } from "#/components/base/badge";
import { Button } from "#/components/base/button";
import {
	ContextMenu,
	ContextMenuGroup,
	ContextMenuGroupLabel,
	ContextMenuItem,
	ContextMenuPopup,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubPopup,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "#/components/base/context-menu";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuSub,
	MenuSubPopup,
	MenuSubTrigger,
	MenuTrigger,
} from "#/components/base/menu";
import { showQueueToast } from "#/components/player/queueToast";
import { TrackNumberCell } from "#/components/track/TrackNumberCell";
import { useTitleLang } from "#/hooks/use-title-lang";
import type { PlaylistTrackRequest } from "#/lib/queries/playlist.queries";
import {
	formatDurationInHoursAndMinutes,
	formatMsToMMSSOrHMMSS,
} from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";
import {
	albumDetailsToAudioPlayerTracks,
	albumTrackDetailsToAudioPlayerTrack,
} from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type Disc = AlbumDetails["discs"][number];

type AlbumTrackListProps = {
	album: AlbumDetails;
	highlightedTrackId?: number;
	onAddToPlaylist: (track: PlaylistTrackRequest) => void;
};

export function AlbumTrackList({
	album,
	highlightedTrackId,
	onAddToPlaylist,
}: AlbumTrackListProps) {
	const listRef = useRef<HTMLDivElement>(null);
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const addNextToQueue = useAudioPlayerStore((state) => state.addNextToQueue);
	const audioPlayerTracks = albumDetailsToAudioPlayerTracks(album);
	const showDiscBands = album.discs.length > 1;
	const titleLang = useTitleLang();

	useEffect(() => {
		if (highlightedTrackId === undefined) return;
		requestAnimationFrame(() => {
			document
				.getElementById(`track-${highlightedTrackId}`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
	}, [highlightedTrackId]);

	function playTrack(trackId: string) {
		playAlbum(audioPlayerTracks, trackId);
	}

	function playDisc(disc: Disc) {
		const discTrackIds = new Set(
			disc.tracks.map((track) => String(track.trackId)),
		);
		const discTracks = audioPlayerTracks.filter((track) =>
			discTrackIds.has(track.trackId),
		);
		if (discTracks.length > 0) playAlbum(discTracks);
	}

	function focusTrack(offset: number) {
		const buttons = Array.from(
			listRef.current?.querySelectorAll<HTMLButtonElement>(
				'[data-slot="track-play"]',
			) ?? [],
		);
		if (!buttons.length) return;
		const current = buttons.findIndex(
			(button) => button === document.activeElement,
		);
		const next = current === -1 ? 0 : current + offset;
		buttons.at(Math.max(0, Math.min(buttons.length - 1, next)))?.focus();
	}

	function addFocusedTrackNext() {
		const trackId =
			document.activeElement instanceof HTMLElement
				? document.activeElement.dataset.trackId
				: undefined;
		if (!trackId) return;
		for (const disc of album.discs) {
			const track = disc.tracks.find(
				(item) => String(item.trackId) === trackId,
			);
			if (!track?.audios.length) continue;
			addNextToQueue([albumTrackDetailsToAudioPlayerTrack(album, disc, track)]);
			showQueueToast(track.title, { next: true });
			return;
		}
	}

	useHotkey("G", () => playAlbum(audioPlayerTracks));
	useHotkey("Control+G", addFocusedTrackNext);
	useHotkey("W", () => focusTrack(-1));
	useHotkey("A", () => focusTrack(-1));
	useHotkey("S", () => focusTrack(1));
	useHotkey("D", () => focusTrack(1));

	return (
		<div className="flex flex-col gap-8" ref={listRef}>
			{album.discs.map((disc) => (
				<section
					aria-label={showDiscBands ? `Disc ${disc.discNumber}` : "Tracks"}
					className="flex flex-col gap-1"
					key={disc.albumDiscId}
				>
					{showDiscBands && (
						<DiscBand
							disc={disc}
							lang={titleLang(album.languageId)}
							onPlay={() => playDisc(disc)}
						/>
					)}
					<div className="flex flex-col gap-0.5 pt-1">
						{disc.tracks.map((track) => (
							<TrackRow
								album={album}
								disc={disc}
								isHighlighted={highlightedTrackId === Number(track.trackId)}
								key={track.trackId}
								onAddToPlaylist={onAddToPlaylist}
								onPlay={() => playTrack(String(track.trackId))}
								track={track}
							/>
						))}
					</div>
				</section>
			))}
		</div>
	);
}

function DiscBand({
	disc,
	lang,
	onPlay,
}: {
	disc: Disc;
	lang: string | undefined;
	onPlay: () => void;
}) {
	const durationMs = disc.tracks.reduce(
		(total, track) => total + Number(track.durationInMs),
		0,
	);
	const meta = [
		`${disc.tracks.length} ${disc.tracks.length === 1 ? "track" : "tracks"}`,
		formatDurationInHoursAndMinutes(durationMs),
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="flex items-center gap-3 px-3 pb-2">
			<span className="text-xs font-semibold tracking-[.06em] whitespace-nowrap text-muted-foreground uppercase">
				Disc {disc.discNumber}
			</span>
			<span
				className="min-w-0 grow truncate text-sm font-semibold select-text"
				lang={lang}
			>
				{disc.subtitle}
			</span>
			<span className="text-xs whitespace-nowrap text-muted-foreground">
				{meta}
			</span>
			<Button
				aria-label={`Play disc ${disc.discNumber}`}
				onClick={onPlay}
				size="icon-sm"
				variant="ghost"
			>
				<PlayIcon aria-hidden="true" />
			</Button>
		</div>
	);
}

type TrackRowProps = {
	album: AlbumDetails;
	disc: Disc;
	track: AlbumTrack;
	isHighlighted: boolean;
	onPlay: () => void;
	onAddToPlaylist: (track: PlaylistTrackRequest) => void;
};

function TrackRow({
	album,
	disc,
	track,
	isHighlighted,
	onPlay,
	onAddToPlaylist,
}: TrackRowProps) {
	const addToQueue = useAudioPlayerStore((state) => state.addToQueue);
	const addNextToQueue = useAudioPlayerStore((state) => state.addNextToQueue);
	const [menuOpen, setMenuOpen] = useState(false);
	const titleLang = useTitleLang();
	const playerTrack = useAudioPlayerStore((state) =>
		state.queue.at(state.index),
	);
	const isPlaying = useAudioPlayerStore(
		(state) => state.status === "playing" || state.status === "loading",
	);
	const isCurrent =
		playerTrack?.trackId === String(track.trackId) &&
		playerTrack.albumId === String(album.albumId);
	const canPlay = track.audios.length > 0;
	const badges = [
		track.versionType !== "Original" ? track.versionType : null,
		track.contentType !== "Music"
			? getContentTypeLabel(track.contentType)
			: null,
	].filter((badge): badge is string => badge !== null);

	function queue(next: boolean) {
		const tracks = [albumTrackDetailsToAudioPlayerTrack(album, disc, track)];
		if (next) addNextToQueue(tracks);
		else addToQueue(tracks);
		showQueueToast(track.title, { next });
	}

	const actions: TrackMenuActions = {
		album,
		track,
		canPlay,
		onPlay,
		onQueue: queue,
		onAddToPlaylist: () =>
			onAddToPlaylist({
				albumDiscId: disc.albumDiscId,
				trackId: track.trackId,
			}),
	};

	// The trigger is `contents` so the row keeps its grid, and the "more" menu
	// stays outside it: a menu inside the trigger would reopen this one on
	// right-click.
	return (
		<div
			className={cn(
				"group/track relative grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_auto_2rem] items-center gap-x-4 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-accent has-[[data-popup-open]]:bg-accent motion-reduce:transition-none",
				isHighlighted && "animate-track-highlight",
			)}
			id={`track-${track.trackId}`}
		>
			<ContextMenu>
				<ContextMenuTrigger
					className="contents"
					// A long press opens the menu; the click on release would close it.
					onTouchEnd={(event) => {
						if (event.currentTarget.hasAttribute("data-popup-open")) {
							event.preventDefault();
						}
					}}
				>
					<TrackNumberCell
						isCurrent={isCurrent}
						isPlaying={isPlaying}
						number={track.trackNumber}
					/>

					<button
						aria-label={`Play ${track.title}`}
						className="flex min-w-0 cursor-pointer flex-col text-left outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring disabled:cursor-default"
						data-slot="track-play"
						data-track-id={track.trackId}
						disabled={!canPlay}
						onClick={onPlay}
						type="button"
					>
						<span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
							<span
								className={cn(
									"min-w-0 truncate text-sm font-semibold",
									isCurrent && "text-primary",
								)}
								lang={titleLang(track.languageId, album.languageId)}
							>
								{track.title}
							</span>
							{badges.map((badge) => (
								<Badge
									className="max-w-full overflow-hidden"
									key={badge}
									variant="secondary"
								>
									{badge}
								</Badge>
							))}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{getCreditNames(track.credits) || "No credits"}
						</span>
					</button>

					<span className="text-xs font-medium text-muted-foreground tabular-nums">
						{formatMsToMMSSOrHMMSS(Number(track.durationInMs))}
					</span>
				</ContextMenuTrigger>
				<ContextMenuPopup className="w-52">
					<TrackMenuItems {...actions} parts={contextMenuParts} />
				</ContextMenuPopup>
			</ContextMenu>

			<div className="relative z-10 opacity-100 transition-opacity group-focus-within/track:opacity-100 group-hover/track:opacity-100 md:pointer-fine:opacity-0">
				<Menu onOpenChange={setMenuOpen} open={menuOpen}>
					<MenuTrigger
						onContextMenu={(event) => {
							event.preventDefault();
							setMenuOpen(true);
						}}
						render={
							<Button
								aria-label={`Open menu for ${track.title}`}
								size="icon-sm"
								variant="ghost"
							/>
						}
					>
						<EllipsisIcon aria-hidden="true" />
					</MenuTrigger>
					<MenuPopup align="end" className="w-52" sideOffset={6}>
						<TrackMenuItems {...actions} parts={menuParts} />
					</MenuPopup>
				</Menu>
			</div>
		</div>
	);
}

const menuParts = {
	Item: MenuItem,
	Separator: MenuSeparator,
	Sub: MenuSub,
	SubTrigger: MenuSubTrigger,
	SubPopup: MenuSubPopup,
	Group: MenuGroup,
	GroupLabel: MenuGroupLabel,
};

const contextMenuParts: typeof menuParts = {
	Item: ContextMenuItem,
	Separator: ContextMenuSeparator,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubPopup: ContextMenuSubPopup,
	Group: ContextMenuGroup,
	GroupLabel: ContextMenuGroupLabel,
};

type TrackMenuActions = {
	album: AlbumDetails;
	track: AlbumTrack;
	canPlay: boolean;
	onPlay: () => void;
	onQueue: (next: boolean) => void;
	onAddToPlaylist: () => void;
};

function TrackMenuItems({
	album,
	track,
	canPlay,
	onPlay,
	onQueue,
	onAddToPlaylist,
	parts: { Item, Separator, Sub, SubTrigger, SubPopup, Group, GroupLabel },
}: TrackMenuActions & { parts: typeof menuParts }) {
	return (
		<>
			<Item onClick={() => void copyText(track.title)}>
				<CopyIcon aria-hidden="true" />
				Copy name
			</Item>
			{track.credits.length > 0 && (
				<Item onClick={() => void copyText(getCreditNames(track.credits))}>
					<CopyIcon aria-hidden="true" />
					Copy artists
				</Item>
			)}
			<Separator />
			<Item disabled={!canPlay} onClick={onPlay}>
				<PlayIcon aria-hidden="true" />
				Play
			</Item>
			<Item disabled={!canPlay} onClick={() => onQueue(true)}>
				<ListStartIcon aria-hidden="true" />
				Play next
			</Item>
			<Item disabled={!canPlay} onClick={() => onQueue(false)}>
				<ListEndIcon aria-hidden="true" />
				Add to queue
			</Item>
			<Item onClick={onAddToPlaylist}>
				<ListMusicIcon aria-hidden="true" />
				Add to playlist
			</Item>
			<Item onClick={() => void shareAlbumLink(album, String(track.trackId))}>
				<Share2Icon aria-hidden="true" />
				Share track
			</Item>
			{track.audios.length > 0 && (
				<>
					<Separator />
					<Sub>
						<SubTrigger>
							<DownloadIcon aria-hidden="true" />
							Download
						</SubTrigger>
						<SubPopup>
							{track.audios.map((audio) => (
								<Group key={audio.rank}>
									<GroupLabel>
										{[
											`Rank ${audio.rank}`,
											audio.pinned ? "Pinned" : null,
											audio.source,
										]
											.filter(Boolean)
											.join(" - ")}
									</GroupLabel>
									<Item
										onClick={() =>
											void downloadTrackFile(
												album,
												track.title,
												audio.source,
												audio.file.original.url,
											)
										}
									>
										Original
									</Item>
									{audio.file.taggedOriginal && (
										<Item
											onClick={() =>
												void downloadTrackFile(
													album,
													track.title,
													audio.source,
													audio.file.taggedOriginal!.url,
												)
											}
										>
											Tagged original
										</Item>
									)}
									{audio.file.opus96 && (
										<Item
											onClick={() =>
												void downloadTrackFile(
													album,
													track.title,
													audio.source,
													audio.file.opus96!.url,
												)
											}
										>
											Opus 96
										</Item>
									)}
								</Group>
							))}
						</SubPopup>
					</Sub>
				</>
			)}
		</>
	);
}
