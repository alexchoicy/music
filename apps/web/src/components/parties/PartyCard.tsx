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
		<div className={cn(className)} data-slot="party-card">
			<Link
				className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				params={{ id: String(party.partyId) }}
				to="/parties/$id"
			>
				<Card className="h-full overflow-hidden transition-all in-[[data-slot=party-card]:hover]:-translate-y-0.5 in-[[data-slot=party-card]:hover]:shadow-md">
					<CardPanel className="flex flex-col gap-4 p-4">
						<div className="flex items-start gap-4">
							<Avatar className="size-20 rounded-2xl border bg-muted shadow-sm">
								{party.coverUrl && (
									<AvatarImage
										alt={`${party.name} cover`}
										src={party.coverUrl}
									/>
								)}
								<AvatarFallback className="rounded-2xl text-lg">
									{getInitials(party.name)}
								</AvatarFallback>
							</Avatar>

							<div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
								<Tooltip>
									<TooltipTrigger
										render={
											<CardTitle
												className="truncate text-xl leading-tight"
												render={<h2 />}
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

						<div className="mt-auto flex flex-col gap-4">
							<div className="flex flex-wrap gap-1.5">
								{party.type && <Badge>{PARTY_TYPE[party.type]}</Badge>}
								<Badge variant="secondary">{PARTY_KIND[party.kind]}</Badge>
								{gender && <Badge variant="outline">{gender}</Badge>}
							</div>

							<div className="mt-auto flex items-center justify-between border-t pt-3 text-sm">
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
