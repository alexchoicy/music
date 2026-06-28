import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Disc3Icon, MicVocalIcon, UsersRoundIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AlbumCard } from "#/components/AlbumCard";
import { ConcertCard } from "#/components/concerts/ConcertCard";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/coss/card";
import { PartyCard } from "#/components/parties/PartyCard";
import { albumQueries } from "#/lib/queries/album.queries";
import { concertQueries } from "#/lib/queries/concert.queries";
import { partyQueries } from "#/lib/queries/party.queries";

export const Route = createFileRoute("/_authed/")({
	loader: ({ context }) => {
		return Promise.all([
			context.queryClient.ensureQueryData(
				albumQueries.getAlbums({ Sort: "CreatedAtDesc" }),
			),
			context.queryClient.ensureQueryData(
				concertQueries.getConcerts({ Sort: "CreatedAtDesc" }),
			),
			context.queryClient.ensureQueryData(
				partyQueries.getParties({
					ExcludeNoAlbums: true,
					Sort: "CreatedAtDesc",
				}),
			),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { data: albums } = useSuspenseQuery(
		albumQueries.getAlbums({ Sort: "CreatedAtDesc" }),
	);
	const { data: concerts } = useSuspenseQuery(
		concertQueries.getConcerts({ Sort: "CreatedAtDesc" }),
	);
	const { data: parties } = useSuspenseQuery(
		partyQueries.getParties({ ExcludeNoAlbums: true, Sort: "CreatedAtDesc" }),
	);

	return (
		<main className="flex min-h-full w-full flex-col gap-8 p-4 sm:p-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-3xl font-semibold tracking-tight">
					Overview
				</h1>
			</header>

			<section
				aria-label="Library counts"
				className="grid gap-4 md:grid-cols-3"
			>
				<CounterCard
					count={albums.length}
					icon={<Disc3Icon aria-hidden="true" />}
					label="Albums"
					to="/albums"
				/>
				<CounterCard
					count={parties.length}
					icon={<UsersRoundIcon aria-hidden="true" />}
					label="Parties"
					to="/parties"
				/>
				<CounterCard
					count={concerts.length}
					icon={<MicVocalIcon aria-hidden="true" />}
					label="Concerts"
					to="/concerts"
				/>
			</section>

			<RecentSection
				containerClassName="h-[280px] sm:h-[410px]"
				title="Recent albums"
				to="/albums"
			>
				{albums.map((album) => {
					return (
						<AlbumCard
							album={album}
							className="h-[256px] w-[calc(50%-0.5rem)] min-w-[140px] sm:h-[385px] sm:w-[250px]"
							key={album.albumId}
						/>
					);
				})}
			</RecentSection>

			<RecentSection
				containerClassName="h-[260px] sm:h-[285px]"
				title="Recent concerts"
				to="/concerts"
			>
				{concerts.map((concert) => {
					return (
						<ConcertCard
							className="h-[235px] w-[calc(50%-0.5rem)] min-w-[140px] sm:h-[260px] sm:w-[250px]"
							concert={concert}
							key={concert.concertId}
						/>
					);
				})}
			</RecentSection>

			<RecentSection
				containerClassName="h-[260px] sm:h-[205px]"
				title="Recent parties"
				to="/parties"
			>
				{parties.map((party) => {
					return (
						<PartyCard
							className="h-[235px] w-[calc(50%-0.5rem)] min-w-[140px] sm:h-[180px] sm:w-[250px]"
							key={party.partyId}
							party={party}
						/>
					);
				})}
			</RecentSection>
		</main>
	);
}

type CounterCardProps = {
	count: number;
	icon: ReactNode;
	label: string;
	to: "/albums" | "/concerts" | "/parties";
};

function CounterCard({ count, icon, label, to }: CounterCardProps) {
	return (
		<Link
			className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			to={to}
		>
			<Card className="h-full transition-shadow hover:shadow-md">
				<CardHeader className="grid-cols-[1fr_auto] gap-4">
					<div className="flex flex-col gap-2">
						<CardDescription>{label}</CardDescription>
						<CardTitle className="text-4xl font-semibold tabular-nums">
							{count}
						</CardTitle>
					</div>
					<div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-6">
						{icon}
					</div>
				</CardHeader>
			</Card>
		</Link>
	);
}

type RecentSectionProps = {
	children: ReactNode;
	containerClassName: string;
	title: string;
	to: "/albums" | "/concerts" | "/parties";
};

function RecentSection({
	children,
	containerClassName,
	title,
	to,
}: RecentSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-end justify-between gap-4">
				<h2 className="font-heading text-xl font-semibold tracking-tight">
					{title}
				</h2>
				<Link
					className="text-sm font-medium text-muted-foreground hover:text-foreground"
					to={to}
				>
					View all
				</Link>
			</div>

			<div
				className={`${containerClassName} flex flex-row flex-wrap justify-center gap-4 overflow-hidden p-3`}
			>
				{children}
			</div>
		</section>
	);
}
