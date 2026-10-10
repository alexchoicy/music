import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { AlbumGrid } from "#/components/AlbumGrid";
import { ConcertCard } from "#/components/concerts/ConcertCard";
import { ContinueListening } from "#/components/home/ContinueListening";
import { LibraryCounts } from "#/components/home/LibraryCounts";
import { PartyCard } from "#/components/parties/PartyCard";
import { homeQueries } from "#/lib/queries/home.queries";
import { statsQueries } from "#/lib/queries/stats.queries";
import { onListeningHistoryRecorded } from "#/store/audioPlayer/listeningHistory";
import { usePlaybackDeviceStore } from "#/store/playbackDeviceStore";

const FEED_REFRESH_DELAY_MS = 1000;

export const Route = createFileRoute("/_authed/")({
	// Resume points are filtered by this browser's device and shown in local relative time.
	ssr: "data-only",
	loader: ({ context }) => {
		return Promise.all([
			context.queryClient.ensureQueryData(statsQueries.getLibraryStats()),
			context.queryClient.ensureQueryData(
				homeQueries.getFeed(context.userInfo.id),
			),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { userInfo } = Route.useRouteContext();
	const queryClient = useQueryClient();
	const { data: stats } = useSuspenseQuery(statsQueries.getLibraryStats());
	const { data: feed } = useSuspenseQuery(homeQueries.getFeed(userInfo.id));

	useEffect(() => {
		let refreshTimer: number | undefined;
		const refresh = () => {
			window.clearTimeout(refreshTimer);
			refreshTimer = window.setTimeout(() => {
				void queryClient.invalidateQueries({
					queryKey: homeQueries.getFeed(userInfo.id).queryKey,
				});
			}, FEED_REFRESH_DELAY_MS);
		};
		const unsubscribeHistory = onListeningHistoryRecorded(refresh);
		// The server saves resume points before announcing device changes.
		const unsubscribeDevices = usePlaybackDeviceStore.subscribe(
			(state, previous) => {
				if (state.devices !== previous.devices) refresh();
			},
		);
		return () => {
			window.clearTimeout(refreshTimer);
			unsubscribeHistory();
			unsubscribeDevices();
		};
	}, [queryClient, userInfo.id]);

	return (
		<main className="flex min-h-full w-full min-w-0 flex-col gap-5 p-4 sm:gap-8 sm:p-6">
			<header className="flex flex-col gap-1">
				<p className="text-sm font-medium text-muted-foreground">Library</p>
				<h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-4xl">
					Home
				</h1>
			</header>

			<LibraryCounts overview={stats} />

			<ContinueListening items={feed.continueListening} />

			{feed.recentlyPlayed.length > 0 && (
				<RecentSection title="Recently played" to="/history">
					<AlbumGrid albums={feed.recentlyPlayed} variant="preview" />
				</RecentSection>
			)}

			<RecentSection title="Recently added albums" to="/albums">
				<AlbumGrid albums={feed.recentAlbums} variant="preview" />
			</RecentSection>

			<RecentSection title="Recently added parties" to="/parties">
				<RecentGrid>
					{feed.recentParties.map((party) => {
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

			<RecentSection title="Recently added concerts" to="/concerts">
				<RecentGrid>
					{feed.recentConcerts.map((concert) => {
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
		</main>
	);
}

type RecentSectionProps = {
	children: ReactNode;
	title: string;
	to: "/albums" | "/concerts" | "/parties" | "/history";
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
					search={to === "/history" ? {} : { sort: "CreatedAtDesc" }}
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
