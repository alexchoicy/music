import { Link } from "@tanstack/react-router";
import { CalendarIcon, ClockIcon, Disc3Icon } from "lucide-react";

import { AlbumCard } from "#/components/AlbumCard";
import { Avatar, AvatarFallback } from "#/components/coss/avatar";
import type { components } from "#/data/APIschema";
import { getCoverUrl } from "#/lib/utils/album";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { getInitials } from "#/lib/utils/string";

type Concert = components["schemas"]["ConcertDetails"];
type ConcertParty = components["schemas"]["ConcertPartySummary"];

const PARTY_ROLE: Record<ConcertParty["role"], string> = {
	MainArtist: "Main Artist",
	Guest: "Guest",
};

type ConcertDetailsProps = {
	concert: Concert;
};

export function ConcertDetails({ concert }: ConcertDetailsProps) {
	const dateLabel = formatDate(concert.date);
	const durationLabel = formatDurationInHoursAndMinutes(
		concert.totalDurationInMs,
	);
	const description = concert.description?.trim();
	const albumCount = concert.linkedAlbums.length;
	const fileCount = concert.files.length;
	const coverUrl = getCoverUrl(concert.coverVariants);

	return (
		<section className="flex flex-col gap-6">
			<header className="flex gap-4">
				{coverUrl && (
					<img
						alt={`${concert.title} concert cover`}
						className="aspect-video w-32 shrink-0 rounded-xl object-cover sm:w-40"
						src={coverUrl}
					/>
				)}
				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
						{concert.title}
					</h1>

					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
						{dateLabel && (
							<span className="flex items-center gap-1">
								<CalendarIcon aria-hidden="true" className="size-3.5" />
								{dateLabel}
							</span>
						)}
						{dateLabel && <span aria-hidden="true">&middot;</span>}
						<span>
							{fileCount} file{fileCount === 1 ? "" : "s"}
						</span>
						{durationLabel && (
							<>
								<span aria-hidden="true">&middot;</span>
								<span className="flex items-center gap-1">
									<ClockIcon aria-hidden="true" className="size-3.5" />
									{durationLabel}
								</span>
							</>
						)}
						{albumCount > 0 && (
							<>
								<span aria-hidden="true">&middot;</span>
								<span className="flex items-center gap-1">
									<Disc3Icon aria-hidden="true" className="size-3.5" />
									{albumCount} album{albumCount === 1 ? "" : "s"}
								</span>
							</>
						)}
					</div>

					{description && (
						<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
							{description}
						</p>
					)}
				</div>
			</header>

			{concert.linkedParties.length > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
						Performers
					</h2>
					<div className="flex flex-wrap items-center gap-2">
						{concert.linkedParties.map((party) => (
							<PartyChip key={party.partyId} party={party} />
						))}
					</div>
				</section>
			)}

			{concert.linkedAlbums.length > 0 && (
				<section className="flex flex-col gap-2">
					<h2 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
						Linked Albums
					</h2>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{concert.linkedAlbums.map((album) => (
							<AlbumCard album={album} key={album.albumId} />
						))}
					</div>
				</section>
			)}
		</section>
	);
}

function PartyChip({ party }: { party: ConcertParty }) {
	return (
		<Link
			className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pr-3 pl-1 transition-colors hover:border-primary/40"
			params={{ id: String(party.partyId) }}
			to="/parties/$id"
		>
			<Avatar className="size-7">
				<AvatarFallback className="text-xs font-bold">
					{getInitials(party.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<p className="text-xs leading-tight font-medium text-foreground">
					{party.name}
				</p>
				<p className="text-[10px] leading-tight text-muted-foreground">
					{PARTY_ROLE[party.role]} &middot; {party.type}
				</p>
			</div>
		</Link>
	);
}
