import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { Separator } from "#/components/coss/separator";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

import { getTrackCredits } from "./albumDetailUtils";
import type { AlbumDetails, PartyCredit } from "./albumDetailUtils";

type AlbumCreditsCardProps = {
	album: AlbumDetails;
	routePrefix?: "/new";
};

export function AlbumCreditsCard({
	album,
	routePrefix,
}: AlbumCreditsCardProps) {
	const trackCredits = getTrackCredits(album);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Credits</CardTitle>
			</CardHeader>
			<CardPanel className="flex flex-col gap-5">
				{album.credits.length > 0 ? (
					<div className="flex flex-col gap-3">
						{album.credits.map((credit) => {
							return (
								<CreditItem
									credit={credit}
									key={`${credit.partyId}-${credit.creditType}`}
									routePrefix={routePrefix}
								/>
							);
						})}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">No album credits.</p>
				)}

				{trackCredits.length > 0 && (
					<>
						<Separator />
						<div className="flex flex-col gap-3">
							<p className="text-sm font-medium text-muted-foreground">
								Track Credits
							</p>
							{trackCredits.map((credit) => {
								return (
									<CreditItem
										credit={credit}
										key={`${credit.partyId}-${credit.creditType}`}
										routePrefix={routePrefix}
									/>
								);
							})}
						</div>
					</>
				)}
			</CardPanel>
		</Card>
	);
}

function CreditItem({
	credit,
	routePrefix,
}: {
	credit: PartyCredit;
	routePrefix?: "/new";
}) {
	const avatarUrl = getPartyAvatarUrl(credit.avatar);

	return (
		<Link
			className="-mx-2 block rounded-lg p-2 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
			to={routePrefix ? "/new/parties/$id" : "/parties/$id"}
			params={{ id: String(credit.partyId) }}
		>
			<div className="flex min-w-0 items-center gap-3">
				<Avatar>
					{avatarUrl && (
						<AvatarImage alt={`${credit.name} avatar`} src={avatarUrl} />
					)}
					<AvatarFallback>{getInitials(credit.name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="truncate font-medium">{credit.name}</p>
					<p className="text-sm text-muted-foreground">{credit.creditType}</p>
				</div>
			</div>
		</Link>
	);
}
