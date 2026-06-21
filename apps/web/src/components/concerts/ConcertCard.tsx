import { Link } from "@tanstack/react-router";
import { MicVocalIcon } from "lucide-react";

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
import { formatDate } from "#/lib/utils/date";
import { formatDurationInHoursAndMinutes } from "#/lib/utils/music";

type Concert = components["schemas"]["ConcertListItem"];

type ConcertCardProps = {
	concert: Concert;
};

export function ConcertCard({ concert }: ConcertCardProps) {
	const coverUrl = getCoverUrl(concert.coverVariants);
	const dateLabel = formatDate(concert.date) ?? "No date";
	const durationLabel =
		formatDurationInHoursAndMinutes(concert.totalDurationInMs) ?? "0m";
	const partyNames =
		concert.parties.map((party) => party.name).join(", ") || "No parties";
	const fileCount = Number(concert.fileCount);
	const albumCount = Number(concert.albumCount);

	return (
		<div data-slot="concert-card">
			<Link
				className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				params={{ id: String(concert.concertId) }}
				to="/concerts/$id"
			>
				<Card className="h-full overflow-hidden transition-shadow in-[[data-slot=concert-card]:hover]:shadow-md">
					<div className="relative aspect-video overflow-hidden bg-muted">
						{coverUrl ? (
							<img
								alt={`${concert.title} concert cover`}
								className="h-full w-full object-cover transition-transform duration-300 in-[[data-slot=concert-card]:hover]:scale-105"
								src={coverUrl}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center text-muted-foreground">
								<MicVocalIcon aria-hidden="true" className="size-12" />
							</div>
						)}

						<Badge className="absolute end-3 top-3 bg-card/85 text-card-foreground shadow-sm backdrop-blur-sm">
							{dateLabel}
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
									{concert.title}
								</TooltipTrigger>
								<TooltipPopup className="max-w-72">
									{concert.title}
								</TooltipPopup>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger
									render={<CardDescription className="truncate" />}
								>
									{partyNames}
								</TooltipTrigger>
								<TooltipPopup className="max-w-72">{partyNames}</TooltipPopup>
							</Tooltip>
						</div>

						<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
							<span>
								{fileCount} file{fileCount === 1 ? "" : "s"}
							</span>
							<span aria-hidden="true">&middot;</span>
							<span>
								{albumCount} album{albumCount === 1 ? "" : "s"}
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
