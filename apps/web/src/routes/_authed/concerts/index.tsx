import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ConcertCard } from "#/components/concerts/ConcertCard";
import { concertQueries } from "#/lib/queries/concert.queries";

export const Route = createFileRoute("/_authed/concerts/")({
	loader: ({ context }) => {
		return context.queryClient.ensureQueryData(concertQueries.getConcerts());
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: concerts } = useSuspenseQuery(concertQueries.getConcerts());

	return (
		<main className="flex min-h-full w-full flex-col gap-6 p-4 sm:p-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Concerts
				</h1>
			</header>

			{concerts.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
					{concerts.map((concert) => {
						return <ConcertCard concert={concert} key={concert.concertId} />;
					})}
				</div>
			)}
		</main>
	);
}
