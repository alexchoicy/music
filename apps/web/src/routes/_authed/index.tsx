import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AlbumGrid } from "#/components/AlbumGrid";
import { ConcertCard } from "#/components/concerts/ConcertCard";
import { LibraryCounts } from "#/components/home/LibraryCounts";
import { PartyCard } from "#/components/parties/PartyCard";
import { albumQueries } from "#/lib/queries/album.queries";
import { concertQueries } from "#/lib/queries/concert.queries";
import { homeQueries } from "#/lib/queries/home.queries";
import { partyQueries } from "#/lib/queries/party.queries";

export const Route = createFileRoute("/_authed/")({
	loader: ({ context }) => {
		return Promise.all([
			context.queryClient.ensureQueryData(homeQueries.getOverview()),
			context.queryClient.ensureQueryData(
				albumQueries.getAlbums({ Sort: "CreatedAtDesc", Limit: 10 }),
			),
			context.queryClient.ensureQueryData(
				concertQueries.getConcerts({ Sort: "CreatedAtDesc", Limit: 10 }),
			),
			context.queryClient.ensureQueryData(
				partyQueries.getParties({
					ExcludeNoAlbums: true,
					Sort: "CreatedAtDesc",
					Limit: 10,
				}),
			),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: overview } = useSuspenseQuery(homeQueries.getOverview());
	const { data: albums } = useSuspenseQuery(
		albumQueries.getAlbums({ Sort: "CreatedAtDesc", Limit: 10 }),
	);
	const { data: concerts } = useSuspenseQuery(
		concertQueries.getConcerts({ Sort: "CreatedAtDesc", Limit: 10 }),
	);
	const { data: parties } = useSuspenseQuery(
		partyQueries.getParties({
			ExcludeNoAlbums: true,
			Sort: "CreatedAtDesc",
			Limit: 10,
		}),
	);

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-5 p-4 sm:gap-8 sm:p-6">
			<header className="flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-4xl">
					Overview
				</h1>
			</header>

			<LibraryCounts overview={overview} />

			<RecentSection title="Recent albums" to="/albums">
				<AlbumGrid albums={albums} variant="preview" />
			</RecentSection>

			<RecentSection title="Recent concerts" to="/concerts">
				<RecentGrid>
					{concerts.map((concert) => {
						return (
							<ConcertCard
								className="min-w-0"
								concert={concert}
								key={concert.concertId}
							/>
						);
					})}
				</RecentGrid>
			</RecentSection>

			<RecentSection title="Recent parties" to="/parties">
				<RecentGrid>
					{parties.map((party) => {
						return (
							<PartyCard
								className="min-w-0"
								key={party.partyId}
								party={party}
							/>
						);
					})}
				</RecentGrid>
			</RecentSection>
		</main>
	);
}

type RecentSectionProps = {
	children: ReactNode;
	title: string;
	to: "/albums" | "/concerts" | "/parties";
};

function RecentSection({ children, title, to }: RecentSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-end justify-between gap-4">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					{title}
				</h2>
				<Link
					className="text-sm font-medium text-muted-foreground hover:text-foreground"
					search={{ sort: "CreatedAtDesc" }}
					to={to}
				>
					View all
				</Link>
			</div>

			{children}
		</section>
	);
}

function RecentGrid({ children }: { children: ReactNode }) {
	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 [&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block md:[&>*:nth-child(n+4)]:hidden lg:[&>*:nth-child(n+4)]:block lg:[&>*:nth-child(n+5)]:hidden xl:[&>*:nth-child(n+5)]:block xl:[&>*:nth-child(n+6)]:hidden 2xl:[&>*:nth-child(n+6)]:block 2xl:[&>*:nth-child(n+7)]:hidden">
			{children}
		</div>
	);
}
