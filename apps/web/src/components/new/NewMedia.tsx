import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	CalendarDaysIcon,
	Disc3Icon,
	MicVocalIcon,
	PlayIcon,
	UsersRoundIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
import { Badge } from "#/components/coss/badge";
import { Button } from "#/components/coss/button";
import type { components } from "#/data/APIschema";
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { albumQueries } from "#/lib/queries/album.queries";
import { getAlbumCoverUrl } from "#/lib/utils/album";
import { getConcertCoverUrl } from "#/lib/utils/concert";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { getInitials } from "#/lib/utils/string";
import { albumDetailsToAudioPlayerTracks } from "#/store/audioPlayer/audioPlayerFunction";
import { useAudioPlayerStore } from "#/store/audioPlayer/audioPlayerStore";

type Album = components["schemas"]["AlbumListItem"];
type Concert = components["schemas"]["ConcertListItem"];
type Party = components["schemas"]["PartyItems"];

export function NewAlbumTile({ album }: { album: Album }) {
	const queryClient = useQueryClient();
	const playAlbum = useAudioPlayerStore((state) => state.playAlbum);
	const coverUrl = getAlbumCoverUrl(album.coverVariants);
	const artists =
		album.artists.map((artist) => artist.name).join(", ") || "Unknown artist";

	async function play() {
		const details = await queryClient.ensureQueryData(
			albumQueries.getAlbum(album.albumId),
		);
		playAlbum(albumDetailsToAudioPlayerTracks(details));
	}

	return (
		<article
			className="group relative min-w-0"
			data-album-id={album.albumId}
			data-slot="album-card"
		>
			<div className="relative mb-3 aspect-square overflow-hidden rounded-[1.4rem] bg-muted shadow-[0_14px_40px_-28px_rgba(0,0,0,.8)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_55px_-28px_rgba(0,0,0,.8)]">
				<Link
					className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
					params={{ id: String(album.albumId) }}
					to="/new/albums/$id"
				>
					{coverUrl ? (
						<img
							alt={`${album.title} album cover`}
							className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
							loading="lazy"
							src={coverUrl}
						/>
					) : (
						<span className="flex size-full items-center justify-center bg-linear-to-br from-muted to-card text-muted-foreground">
							<Disc3Icon className="size-12" />
						</span>
					)}
				</Link>
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-black/55 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
				<Button
					aria-label={`Play ${album.title}`}
					className="absolute right-3 bottom-3 translate-y-2 rounded-full opacity-0 shadow-xl transition-all group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100"
					onClick={() => void play()}
					size="icon"
				>
					<PlayIcon className="fill-current" />
				</Button>
			</div>
			<Link
				className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
				params={{ id: String(album.albumId) }}
				to="/new/albums/$id"
			>
				<h3
					className="truncate font-semibold tracking-tight"
					title={album.title}
				>
					{album.title}
				</h3>
				<p
					className="mt-1 truncate text-sm text-muted-foreground"
					title={artists}
				>
					{artists}
				</p>
				<p className="mt-1 text-xs text-muted-foreground/75">
					{album.type} · {album.trackCount} track
					{album.trackCount === 1 ? "" : "s"}
				</p>
			</Link>
		</article>
	);
}

export function NewConcertRow({ concert }: { concert: Concert }) {
	const coverUrl = getConcertCoverUrl(concert.coverVariants);
	const artists =
		concert.parties.map((party) => party.name).join(", ") || "No performers";
	const duration =
		formatDurationInHoursAndMinutes(concert.totalDurationInMs) ?? "0m";

	return (
		<Link
			className="group grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-2 py-3 transition-colors outline-none hover:bg-accent/55 focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:px-3"
			params={{ id: String(concert.concertId) }}
			to="/new/concerts/$id"
		>
			<div className="aspect-video overflow-hidden rounded-xl bg-muted">
				{coverUrl ? (
					<img
						alt=""
						className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
						loading="lazy"
						src={coverUrl}
					/>
				) : (
					<span className="flex size-full items-center justify-center text-muted-foreground">
						<MicVocalIcon />
					</span>
				)}
			</div>
			<div className="min-w-0">
				<h3 className="truncate font-semibold tracking-tight">
					{concert.title}
				</h3>
				<p className="mt-1 truncate text-sm text-muted-foreground">{artists}</p>
				<p className="mt-2 hidden items-center gap-1.5 text-xs text-muted-foreground/75 sm:flex">
					<CalendarDaysIcon className="size-3.5" />
					{formatDate(concert.date) ?? "Date unknown"}
				</p>
			</div>
			<div className="text-right text-xs text-muted-foreground">
				<p>
					{concert.fileCount} file{Number(concert.fileCount) === 1 ? "" : "s"}
				</p>
				<p className="mt-1">{duration}</p>
			</div>
		</Link>
	);
}

export function NewPartyRow({ party }: { party: Party }) {
	return (
		<Link
			className="group flex min-w-0 items-center gap-4 rounded-2xl px-3 py-3 transition-colors outline-none hover:bg-accent/55 focus-visible:ring-2 focus-visible:ring-ring"
			params={{ id: String(party.partyId) }}
			to="/new/parties/$id"
		>
			<Avatar className="size-14 rounded-2xl border bg-muted sm:size-16">
				{party.coverUrl ? <AvatarImage alt="" src={party.coverUrl} /> : null}
				<AvatarFallback className="rounded-2xl">
					{getInitials(party.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1">
				<h3 className="truncate font-semibold tracking-tight">{party.name}</h3>
				<p className="mt-1 truncate text-sm text-muted-foreground">
					{COUNTRY_CODE[party.country]}
				</p>
			</div>
			<div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
				{party.type ? (
					<Badge variant="secondary">{PARTY_TYPE[party.type]}</Badge>
				) : null}
				<Badge variant="outline">{PARTY_KIND[party.kind]}</Badge>
			</div>
			<div className="w-16 text-right text-xs text-muted-foreground">
				<span className="block text-base font-semibold text-foreground tabular-nums">
					{party.albumCount}
				</span>
				release{Number(party.albumCount) === 1 ? "" : "s"}
			</div>
		</Link>
	);
}

export function NewMediaFallbackIcon({
	kind,
}: {
	kind: "album" | "concert" | "party";
}) {
	if (kind === "album") return <Disc3Icon />;
	if (kind === "concert") return <MicVocalIcon />;
	return <UsersRoundIcon />;
}
