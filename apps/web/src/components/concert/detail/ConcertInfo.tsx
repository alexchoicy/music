import type * as API from "@music/api";
import { Link } from "@tanstack/react-router";

import { AlbumTile } from "#/components/album/AlbumTile";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { PartyContextMenu } from "#/components/party/PartyContextMenu";
import { PARTY_TYPE } from "#/enums/partyEnums";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

type Concert = API.ConcertDetails;
type ConcertParty = API.ConcertPartySummary;

const PARTY_ROLE: Record<ConcertParty["role"], string> = {
	MainArtist: "Main artist",
	Guest: "Guest",
};

function plural(count: number, word: string) {
	return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function ConcertHeading({ concert }: { concert: Concert }) {
	const meta = [
		formatDate(concert.date),
		plural(concert.files.length, "file"),
		formatDurationInHoursAndMinutes(concert.totalDurationInMs),
		concert.linkedAlbums.length > 0
			? plural(concert.linkedAlbums.length, "album")
			: null,
	]
		.filter(Boolean)
		.join(" · ");
	const description = concert.description?.trim();

	return (
		<section className="flex max-w-190 flex-col gap-4">
			<div className="flex flex-col gap-2">
				<p className="text-xs font-semibold tracking-[.06em] text-muted-foreground uppercase">
					Concert
				</p>
				<h1 className="text-3xl font-bold tracking-[-.03em] break-words select-text lg:text-5xl lg:leading-[52px]">
					{concert.title}
				</h1>
				<p className="text-xs text-muted-foreground select-text">{meta}</p>
			</div>
			{description && (
				<p className="text-base text-pretty text-muted-foreground select-text">
					{description}
				</p>
			)}
		</section>
	);
}

export function ConcertAlbums({ concert }: { concert: Concert }) {
	if (concert.linkedAlbums.length === 0) return null;

	return (
		<section aria-labelledby="concert-albums" className="flex flex-col gap-4">
			<h2 className="text-xl font-semibold tracking-tight" id="concert-albums">
				Linked albums
			</h2>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
				{concert.linkedAlbums.map((album) => (
					<AlbumTile album={album} key={album.albumId} />
				))}
			</div>
		</section>
	);
}

export function ConcertPerformers({ concert }: { concert: Concert }) {
	if (concert.linkedParties.length === 0) return null;

	return (
		<section
			aria-labelledby="concert-performers"
			className="flex flex-col gap-3"
		>
			<h2
				className="text-xl font-semibold tracking-tight"
				id="concert-performers"
			>
				Performers
			</h2>
			<ul className="flex flex-col gap-0.5">
				{concert.linkedParties.map((party) => (
					<li key={party.partyId}>
						<PerformerLink party={party} />
					</li>
				))}
			</ul>
		</section>
	);
}

function PerformerLink({ party }: { party: ConcertParty }) {
	const avatarUrl = getPartyAvatarUrl(party.avatar);

	return (
		<PartyContextMenu
			party={party}
			render={
				<Link
					className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-popup-open:bg-accent motion-reduce:transition-none"
					params={{ id: String(party.partyId) }}
					to="/parties/$id"
				/>
			}
		>
			<Avatar size="md">
				{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
				<AvatarFallback>{getInitials(party.name)}</AvatarFallback>
			</Avatar>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-sm font-semibold">{party.name}</span>
				<span className="text-xs text-muted-foreground">
					{PARTY_ROLE[party.role]} · {PARTY_TYPE[party.type]}
				</span>
			</span>
		</PartyContextMenu>
	);
}
