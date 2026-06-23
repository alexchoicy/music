import { Avatar, AvatarFallback, AvatarImage } from "#/components/coss/avatar";
import { Card, CardHeader, CardPanel, CardTitle } from "#/components/coss/card";
import { Separator } from "#/components/coss/separator";
import { getPartyAvatarUrl } from "#/lib/utils/party";
import { getInitials } from "#/lib/utils/string";

import { getTrackCredits } from "./albumDetailUtils";
import type { AlbumDetails, PartyCredit } from "./albumDetailUtils";

type AlbumCreditsCardProps = {
	album: AlbumDetails;
};

export function AlbumCreditsCard({ album }: AlbumCreditsCardProps) {
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

function CreditItem({ credit }: { credit: PartyCredit }) {
	const avatarUrl = getPartyAvatarUrl(credit.avatar);

	return (
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
	);
}
