import { Link } from "@tanstack/react-router";

import { getTrackCredits } from "#/components/album/detail/albumDetail";
import type {
	AlbumDetails,
	PartyCredit,
} from "#/components/album/detail/albumDetail";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/base/avatar";
import { PartyContextMenu } from "#/components/party/PartyContextMenu";
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursMinutesSeconds } from "#/lib/utils/music";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

export function AlbumCredits({ album }: { album: AlbumDetails }) {
	const trackCredits = getTrackCredits(album);

	return (
		<section aria-labelledby="album-credits" className="flex flex-col gap-3">
			<h2 className="text-base font-semibold" id="album-credits">
				Credits
			</h2>
			{album.credits.length > 0 ? (
				<CreditList credits={album.credits} />
			) : (
				<p className="text-sm text-muted-foreground">No album credits.</p>
			)}
			{trackCredits.length > 0 && (
				<>
					<h3 className="mt-2 text-xs font-medium text-muted-foreground">
						Track credits
					</h3>
					<CreditList credits={trackCredits} />
				</>
			)}
		</section>
	);
}

function CreditList({ credits }: { credits: PartyCredit[] }) {
	return (
		<ul className="flex flex-col gap-0.5">
			{credits.map((credit) => {
				const avatarUrl = getPartyAvatarUrl(credit.avatar);
				return (
					<li key={`${credit.partyId}-${credit.creditType}`}>
						<PartyContextMenu
							party={credit}
							render={
								<Link
									className="-mx-2 flex min-w-0 items-center gap-3 rounded-lg p-2 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-popup-open:bg-accent"
									params={{ id: String(credit.partyId) }}
									to="/parties/$id"
								/>
							}
						>
							<Avatar size="md">
								{avatarUrl && <AvatarImage alt="" src={avatarUrl} />}
								<AvatarFallback>{getInitials(credit.name)}</AvatarFallback>
							</Avatar>
							<span className="flex min-w-0 flex-col">
								<span className="truncate text-sm font-semibold">
									{credit.name}
								</span>
								<span className="text-xs text-muted-foreground">
									{credit.creditType}
								</span>
							</span>
						</PartyContextMenu>
					</li>
				);
			})}
		</ul>
	);
}

export function AlbumAbout({ album }: { album: AlbumDetails }) {
	const rows = [
		{ label: "Release date", value: formatDate(album.releaseDate) },
		{ label: "Type", value: album.type },
		{ label: "Discs", value: String(album.discs.length) },
		{ label: "Tracks", value: String(album.totalTrackCount) },
		{
			label: "Duration",
			value:
				formatDurationInHoursMinutesSeconds(album.totalDurationInMs) ?? "0s",
		},
	].filter((row) => row.value);

	return (
		<section aria-labelledby="album-about" className="flex flex-col gap-3">
			<h2 className="text-base font-semibold" id="album-about">
				About this album
			</h2>
			<dl className="grid grid-cols-[auto_1fr] gap-x-6 text-sm">
				{rows.map((row) => (
					<div className="contents" key={row.label}>
						<dt className="py-2.5 text-muted-foreground">{row.label}</dt>
						<dd className="py-2.5 text-right font-medium tabular-nums">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
