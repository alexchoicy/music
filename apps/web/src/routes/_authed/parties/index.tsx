import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UsersRoundIcon } from "lucide-react";

import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/components/coss/empty";
import { PartyCard } from "#/components/parties/PartyCard";
import { partyQueries } from "#/lib/queries/party.queries";

export const Route = createFileRoute("/_authed/parties/")({
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(partyQueries.getParties());
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Parties
				</h1>
			</header>

			{parties.length > 0 ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{parties.map((party) => {
						return <PartyCard key={party.partyId} party={party} />;
					})}
				</div>
			) : (
				<Empty className="min-h-80 rounded-2xl border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<UsersRoundIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No parties yet</EmptyTitle>
						<EmptyDescription>
							Parties will appear here after they are created.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</main>
	);
}
