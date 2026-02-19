import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { PartyCard } from "@/components/partyCard";
import { AppLayout } from "@/components/ui/appLayout";
import { partyQueries } from "@/lib/queries/party.queries";

export const Route = createFileRoute("/_authed/parties/")({
	component: RouteComponent,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(partyQueries.getParties());
	},
});

function RouteComponent() {
	return (
		<AppLayout>
			<Suspense fallback={<div>Loading...</div>}>
				<PartiesContent />
			</Suspense>
		</AppLayout>
	);
}

function PartiesContent() {
	const { data: parties } = useSuspenseQuery(partyQueries.getParties());

	return (
		<div className="grid p-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
			{parties.map((party) => (
				<PartyCard key={party.partyId} party={party} />
			))}
		</div>
	);
}
