import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { AlbumTile } from "#/components/album/AlbumTile";
import { PageHeader } from "#/components/app/PageHeader";
import { ConcertTile } from "#/components/concert/ConcertTile";
import { ContinueListening } from "#/components/home/ContinueListening";
import { HomeSection, TileRow } from "#/components/home/HomeSection";
import { LibraryCounts } from "#/components/home/LibraryCounts";
import { suppressNativeContextMenu } from "#/components/library/suppressNativeContextMenu";
import { PartyTile } from "#/components/party/PartyTile";
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
		<main
			className="flex min-h-full w-full min-w-0 flex-col gap-8 p-4 sm:p-6"
			onContextMenu={suppressNativeContextMenu}
		>
			<PageHeader title="Home" />

			<LibraryCounts stats={stats} />

			<ContinueListening items={feed.continueListening} />

			{feed.recentlyPlayed.length > 0 && (
				<HomeSection title="Recently played" viewAll="/history">
					<TileRow items={feed.recentlyPlayed}>
						{(album, className) => (
							<AlbumTile
								album={album}
								className={className}
								key={album.albumId}
							/>
						)}
					</TileRow>
				</HomeSection>
			)}

			{feed.recentAlbums.length > 0 && (
				<HomeSection title="Recently added albums" viewAll="/albums">
					<TileRow items={feed.recentAlbums}>
						{(album, className) => (
							<AlbumTile
								album={album}
								className={className}
								key={album.albumId}
							/>
						)}
					</TileRow>
				</HomeSection>
			)}

			{feed.recentParties.length > 0 && (
				<HomeSection title="Recently added parties" viewAll="/parties">
					<TileRow items={feed.recentParties}>
						{(party, className) => (
							<PartyTile
								className={className}
								key={party.partyId}
								party={party}
							/>
						)}
					</TileRow>
				</HomeSection>
			)}

			{feed.recentConcerts.length > 0 && (
				<HomeSection title="Recently added concerts" viewAll="/concerts">
					<TileRow items={feed.recentConcerts} size="wide">
						{(concert, className) => (
							<ConcertTile
								className={className}
								concert={concert}
								key={concert.concertId}
							/>
						)}
					</TileRow>
				</HomeSection>
			)}
		</main>
	);
}
