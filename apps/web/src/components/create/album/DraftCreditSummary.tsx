import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";

import { Badge } from "#/components/coss/badge";
import { partyQueries } from "#/lib/queries/party.queries";
import { getCreditNames } from "#/lib/utils/party";
import type { CreditRequest } from "#/store/albumUploadStoreType";

export function DraftCreditSummary({
	credits,
	hasVariousArtists,
	unsolvedCredits,
}: {
	credits: CreditRequest[];
	hasVariousArtists: boolean;
	unsolvedCredits: string[];
}) {
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());

	const names = getCreditNames(parties, credits);
	const hasUnsolvedCredits = unsolvedCredits.length > 0;

	return (
		<>
			{names.length > 0 ? (
				<span className="min-w-0 truncate">{names.join(", ")}</span>
			) : !hasUnsolvedCredits ? (
				<Badge size="sm" variant="error">
					<AlertCircleIcon aria-hidden="true" />
					No credit
				</Badge>
			) : null}
			{hasUnsolvedCredits && (
				<Badge size="sm" variant="error">
					<AlertCircleIcon aria-hidden="true" />
					Unsolved credits
				</Badge>
			)}
			{hasVariousArtists && (
				<Badge size="sm" variant="warning">
					<AlertCircleIcon aria-hidden="true" />
					Various artists
				</Badge>
			)}
		</>
	);
}
