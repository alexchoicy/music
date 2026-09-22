import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
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
import { COUNTRY_CODE, PARTY_KIND, PARTY_TYPE } from "#/enums/partyEnums";
import { getInitials } from "#/lib/utils/string";
import { cn } from "#/lib/utils/styles";

type Party = components["schemas"]["PartyItems"];

type PartyCardProps = {
	className?: string;
	party: Party;
};

export function PartyCard({ className, party }: PartyCardProps) {
	const albumCount = Number(party.albumCount);
	const gender = party.gender !== "Unknown" ? party.gender : undefined;

	return (
		<div className={cn("@container min-w-0", className)} data-slot="party-card">
			<Link
				className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				params={{ id: String(party.partyId) }}
				to="/parties/$id"
			>
				<Card className="h-full overflow-hidden transition-all in-[[data-slot=party-card]:hover]:-translate-y-0.5 in-[[data-slot=party-card]:hover]:shadow-md">
					<CardPanel className="flex flex-col" size="sm">
						<div className="flex flex-col items-start gap-2 @min-[16rem]:flex-row @min-[16rem]:gap-4">
							<Avatar className="size-12 rounded-2xl border bg-muted shadow-sm @min-[16rem]:size-20">
								{party.coverUrl && (
									<AvatarImage
										alt={`${party.name} cover`}
										src={party.coverUrl}
										loading="lazy"
									/>
								)}
								<AvatarFallback className="rounded-2xl text-lg">
									{getInitials(party.name)}
								</AvatarFallback>
							</Avatar>

							<div className="flex w-full min-w-0 flex-1 flex-col gap-1 @min-[16rem]:pt-1">
								<Tooltip>
									<TooltipTrigger
										render={
											<CardTitle
												className="truncate"
												render={<h2 />}
												size="sm"
											/>
										}
									>
										{party.name}
									</TooltipTrigger>
									<TooltipPopup className="max-w-72">{party.name}</TooltipPopup>
								</Tooltip>
								<CardDescription className="truncate">
									{COUNTRY_CODE[party.country]}
								</CardDescription>
							</div>
						</div>

						<div className="mt-auto flex flex-col gap-3 sm:gap-4">
							<div className="flex flex-wrap gap-1.5">
								{party.type && (
									<Badge size="sm">{PARTY_TYPE[party.type]}</Badge>
								)}
								<Badge size="sm" variant="secondary">
									{PARTY_KIND[party.kind]}
								</Badge>
								{gender && (
									<Badge size="sm" variant="outline">
										{gender}
									</Badge>
								)}
							</div>

							<div className="mt-auto flex flex-wrap items-center justify-between gap-1 border-t pt-2 text-xs sm:pt-3 sm:text-sm">
								<span className="text-muted-foreground">Albums</span>
								<span className="font-semibold tabular-nums">
									{albumCount} {albumCount === 1 ? "release" : "releases"}
								</span>
							</div>
						</div>
					</CardPanel>
				</Card>
			</Link>
		</div>
	);
}
