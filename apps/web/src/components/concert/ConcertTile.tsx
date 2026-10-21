import type * as API from "@music/api";
import { Link } from "@tanstack/react-router";
import { MicVocalIcon } from "lucide-react";

import { getConcertCoverUrl } from "#/lib/utils/concert";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";
import { cn } from "#/lib/utils/styles";

type Concert = API.ConcertListItem;

function plural(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function ConcertTile({
	concert,
	className,
}: {
	concert: Concert;
	className?: string;
}) {
	const coverUrl = getConcertCoverUrl(concert.coverVariants);
	const partyNames = concert.parties.map((party) => party.name).join(", ");
	const meta = [
		plural(Number(concert.fileCount), "file"),
		plural(Number(concert.albumCount), "album"),
		formatDurationInHoursAndMinutes(concert.totalDurationInMs),
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<div
			className={cn(
				"group/tile relative flex min-w-0 flex-col gap-3",
				className,
			)}
		>
			<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted transition-transform duration-150 ease-out group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
				{coverUrl ? (
					<img
						alt=""
						className="size-full object-cover"
						loading="lazy"
						src={coverUrl}
					/>
				) : (
					<span className="flex size-full items-center justify-center text-muted-foreground">
						<MicVocalIcon aria-hidden="true" className="size-10" />
					</span>
				)}
				<span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_--theme(--color-white/8%)]" />
			</div>
			<div className="flex min-w-0 flex-col gap-0.5">
				<Link
					className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-6 focus-visible:after:outline-ring"
					params={{ id: String(concert.concertId) }}
					title={concert.title}
					to="/concerts/$id"
				>
					{concert.title}
				</Link>
				{partyNames && (
					<span
						className="truncate text-xs text-muted-foreground"
						title={partyNames}
					>
						{partyNames}
					</span>
				)}
				<span className="mt-1 truncate text-xs text-muted-foreground">
					{meta}
				</span>
			</div>
		</div>
	);
}
