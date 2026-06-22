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
				<Card className="h-full transition-shadow in-[[data-slot=party-card]:hover]:shadow-md">
					<CardPanel className="flex flex-col gap-4 p-4">
						<div className="flex items-start gap-4">
							<Avatar className="size-16 rounded-2xl border bg-muted">
								{party.coverUrl && (
									<AvatarImage
										alt={`${party.name} avatar`}
										src={party.coverUrl}
									/>
								)}
								<AvatarFallback className="rounded-2xl text-base">
									{getInitials(party.name)}
								</AvatarFallback>
							</Avatar>

							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<div className="flex min-w-0 flex-col gap-1">
									<Tooltip>
										<TooltipTrigger
											render={
												<CardTitle
													className="truncate text-base"
													render={<h2 />}
												/>
											}
										>
											{party.name}
										</TooltipTrigger>
										<TooltipPopup className="max-w-72">
											{party.name}
										</TooltipPopup>
									</Tooltip>
									<CardDescription>
										{COUNTRY_CODE[party.country]}
									</CardDescription>
								</div>

								<div className="flex flex-wrap gap-1.5">
									{party.type && (
										<Badge variant="secondary">{PARTY_TYPE[party.type]}</Badge>
									)}
									<Badge variant="outline">{PARTY_KIND[party.kind]}</Badge>
									{gender && <Badge variant="outline">{gender}</Badge>}
								</div>
							</div>
						</div>

						<div className="mt-auto text-sm font-medium text-muted-foreground">
							{albumCount} album{albumCount === 1 ? "" : "s"} in library
						</div>
					</CardPanel>
				</Card>
			</Link>
		</div>
	);
}
