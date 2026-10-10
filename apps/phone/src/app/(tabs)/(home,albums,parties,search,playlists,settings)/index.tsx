import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { AlbumCard } from "@/components/albums/albumCard";
import { ContinueListening } from "@/components/home/continueListening";
import { PartyCard } from "@/components/parties/partyCard";
import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { formatReleaseDate } from "@/lib/format";
import { getCover, joinNames, toAlbumTile } from "@/lib/music";
import type { ConcertListItem, LibraryStats } from "@/lib/schema";
import { useArtworkUri } from "@/offline/offlineStore";
import { homeQueries } from "@/queries/home";
import { useEndPadding } from "@/store/miniPlayerStore";
import { usePlaybackDeviceStore } from "@/store/playbackDeviceStore";

const cardWidth = 144;
const feedRefreshDelayMs = 1000;

export default function HomeScreen() {
	const feed = useQuery(homeQueries.feed());
	const stats = useQuery(homeQueries.stats());
	const queryClient = useQueryClient();
	const endPadding = useEndPadding(32);

	// The server saves resume points before announcing device changes, so a
	// change on another device brings its Continue listening card.
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const unsubscribe = usePlaybackDeviceStore.subscribe((state, previous) => {
			if (state.devices === previous.devices) return;
			clearTimeout(timer);
			timer = setTimeout(() => {
				void queryClient.invalidateQueries(homeQueries.feed());
			}, feedRefreshDelayMs);
		});
		return () => {
			clearTimeout(timer);
			unsubscribe();
		};
	}, [queryClient]);

	function renderContent() {
		if (feed.isPending) return <Loading />;
		if (feed.data === undefined) {
			return (
				<EmptyState
					action={
						<Button
							loading={feed.isFetching}
							onPress={() => void feed.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="Check your connection and try again."
					icon="offline"
					title="Couldn't load home"
				/>
			);
		}

		const { continueListening, recentlyPlayed, recentAlbums } = feed.data;
		const { recentParties, recentConcerts } = feed.data;

		return (
			<ScrollView
				contentContainerClassName="gap-8 pt-2"
				contentContainerStyle={{ paddingBottom: endPadding }}
				refreshControl={
					<RefreshControl
						onRefresh={() =>
							void queryClient.invalidateQueries({ queryKey: ["home"] })
						}
						refreshing={feed.isRefetching}
					/>
				}
			>
				{stats.data && <StatsRow stats={stats.data} />}
				<ContinueListening items={continueListening} />
				<Row title="Recently played">
					{recentlyPlayed.map((album) => (
						<AlbumCard
							album={toAlbumTile(album)}
							key={album.albumId}
							width={cardWidth}
						/>
					))}
				</Row>
				<Row title="Recently added albums">
					{recentAlbums.map((album) => (
						<AlbumCard
							album={toAlbumTile(album)}
							key={album.albumId}
							width={cardWidth}
						/>
					))}
				</Row>
				<Row title="Recently added parties">
					{recentParties.map((party) => (
						<PartyCard key={party.partyId} party={party} width={112} />
					))}
				</Row>
				<Row title="Recently added concerts">
					{recentConcerts.map((concert) => (
						<ConcertCard concert={concert} key={concert.concertId} />
					))}
				</Row>
			</ScrollView>
		);
	}

	return (
		<Screen>
			<PageHeader title="Home" />
			<View className="flex-1">{renderContent()}</View>
		</Screen>
	);
}

function StatsRow({ stats }: { stats: LibraryStats }) {
	const items = [
		{ label: "Albums", count: stats.albumCount },
		{ label: "Parties", count: stats.artistCount },
		{ label: "Concerts", count: stats.concertCount },
	];

	return (
		<View className="flex-row gap-3 px-4">
			{items.map(({ label, count }) => (
				<View
					accessibilityLabel={`${count} ${label.toLocaleLowerCase()}`}
					accessible
					className="flex-1 gap-1 rounded-2xl bg-surface p-3"
					key={label}
				>
					<Text className="text-xs text-muted-foreground" numberOfLines={1}>
						{label}
					</Text>
					<Text
						className="text-2xl font-bold text-foreground tabular-nums"
						numberOfLines={1}
					>
						{count}
					</Text>
				</View>
			))}
		</View>
	);
}

/** A titled horizontal row; hidden when it has nothing to show. */
function Row({ title, children }: { title: string; children: ReactNode[] }) {
	if (children.length === 0) return null;

	return (
		<View className="gap-2">
			<View className="px-4">
				<SectionHeader title={title} />
			</View>
			<ScrollView
				contentContainerClassName="gap-3.5 px-4"
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</View>
	);
}

// The phone app has no concert pages yet, so the card only shows the concert.
function ConcertCard({ concert }: { concert: ConcertListItem }) {
	const coverUri = useArtworkUri(getCover(concert.coverVariants));
	const detail =
		formatReleaseDate(concert.date) || joinNames(concert.parties) || "Concert";

	return (
		<View
			accessibilityLabel={`${concert.title}, ${detail}`}
			accessible
			className="gap-2"
			style={{ width: cardWidth }}
		>
			<Artwork
				icon="parties"
				recyclingKey={String(concert.concertId)}
				uri={coverUri}
			/>
			<View>
				<Text
					className="text-sm font-semibold text-foreground"
					numberOfLines={1}
				>
					{concert.title}
				</Text>
				<Text className="text-xs text-muted-foreground" numberOfLines={1}>
					{detail}
				</Text>
			</View>
		</View>
	);
}
