import { useQuery } from "@tanstack/react-query";
import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";

import { Alert, AlertDescription, AlertTitle } from "#/components/base/alert";
import { Badge } from "#/components/base/badge";
import { Checkbox } from "#/components/base/checkbox";
import { Label } from "#/components/base/label";
import { partyQueries } from "#/lib/queries/party.queries";
import { getCreditNames } from "#/lib/utils/party";
import type { CreditRequest } from "#/store/albumUploadStoreType";

export function toArtistCredits(partyIds: number[]): CreditRequest[] {
	return partyIds.map((partyId) => ({ partyId, credit: "Artist" }));
}

export function DraftCredits({
	credits,
	hasVariousArtists,
	unsolvedCredits,
}: {
	credits: CreditRequest[];
	hasVariousArtists: boolean;
	unsolvedCredits: string[];
}) {
	const { data: parties = [] } = useQuery(partyQueries.getParties());
	const names = getCreditNames(parties, credits);

	return (
		<>
			<span className="min-w-0 truncate">
				{names.length > 0 ? names.join(", ") : "No artists"}
			</span>
			{unsolvedCredits.length > 0 && (
				<Badge size="sm" variant="warning">
					<TriangleAlertIcon aria-hidden="true" />
					Unmatched: {unsolvedCredits.join(", ")}
				</Badge>
			)}
			{hasVariousArtists && (
				<Badge size="sm" variant="secondary">
					Various artists
				</Badge>
			)}
		</>
	);
}

export function UnmatchedArtistsAlert({
	isDismissed,
	names,
	onDismissedChange,
}: {
	isDismissed: boolean;
	names: string[];
	onDismissedChange: (isDismissed: boolean) => void;
}) {
	const dismissId = useId();

	if (names.length === 0) return null;

	return (
		<Alert variant="warning">
			<TriangleAlertIcon aria-hidden="true" />
			<AlertTitle>No matching artist for {names.join(", ")}</AlertTitle>
			<AlertDescription>
				<span>Pick or create the artists below, then dismiss these names.</span>
				<span className="flex items-center gap-2 text-foreground">
					<Checkbox
						checked={isDismissed}
						id={dismissId}
						onCheckedChange={(checked) => onDismissedChange(checked)}
					/>
					<Label htmlFor={dismissId}>Dismiss on apply</Label>
				</span>
			</AlertDescription>
		</Alert>
	);
}
