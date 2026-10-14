import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";

import { AlbumCard } from "@/components/albums/albumCard";
import { ContinueListening } from "@/components/home/continueListening";
import { PartyCard } from "@/components/parties/partyCard";
import { Artwork } from "@/components/ui/artwork";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { PageHeader, SectionHeader } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { formatReleaseDate } from "@/lib/format";
import { getCover, joinNames, toAlbumTile } from "@/lib/music";
import type { ConcertListItem, LibraryStats } from "@/lib/schema";
import { useArtworkUri } from "@/offline/offlineStore";
import { homeQueries } from "@/queries/home";
import { useEndPadding } from "@/store/miniPlayerStore";
import { usePlaybackDeviceStore } from "@/store/playbackDeviceStore";

const cardWidth = 150;
const concertWidth = 240;
const numberFormatter = new Intl.NumberFormat();
// Tabs are named, since every tab stack holds these routes.
const albumsTab = "/(albums)/albums" as Href;
const partiesTab = "/(parties)/parties" as Href;
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
				contentContainerClassName="gap-8 pt-4"
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
				<Row title="Recently added albums" viewAll={albumsTab}>
					{recentAlbums.map((album) => (
						<AlbumCard
							album={toAlbumTile(album)}
							key={album.albumId}
							width={cardWidth}
						/>
					))}
				</Row>
				<Row title="Recently added parties" viewAll={partiesTab}>
					{recentParties.map((party) => (
						<PartyCard key={party.partyId} party={party} width={120} />
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
	// The phone has no concerts page, so that count does not open one.
	const items = [
		{ label: "Albums", count: stats.albumCount, href: albumsTab },
		{ label: "Parties", count: stats.artistCount, href: partiesTab },
		{ label: "Concerts", count: stats.concertCount, href: null },
	];

	return (
		<View accessibilityLabel="Library counts" className="flex-row px-2">
			{items.map(({ label, count, href }) => (
				<Pressable
					accessibilityLabel={`${numberFormatter.format(Number(count))} ${label.toLocaleLowerCase()}`}
					accessibilityRole={href ? "link" : "text"}
					className="flex-1 flex-row items-center gap-1 rounded-lg px-2 py-3 active:bg-accent"
					disabled={!href}
					key={label}
					onPress={() => href && router.navigate(href)}
				>
					<View className="flex-1 gap-0.5">
						<Text className="text-xs text-muted-foreground" numberOfLines={1}>
							{label}
						</Text>
						<Text
							adjustsFontSizeToFit
							className="text-[28px] leading-8 font-semibold tracking-tight text-foreground tabular-nums"
							numberOfLines={1}
						>
							{numberFormatter.format(Number(count))}
						</Text>
					</View>
					{href && (
						<Icon
							className="accent-muted-foreground"
							name="chevronRight"
							size={16}
						/>
					)}
				</Pressable>
			))}
		</View>
	);
}

/** A titled horizontal row; hidden when it has nothing to show. */
function Row({
	title,
	viewAll,
	children,
}: {
	title: string;
	/** The tab with the full list. */
	viewAll?: Href;
	children: ReactNode[];
}) {
	if (children.length === 0) return null;

	return (
		<View className="gap-3">
			<View className="px-4">
				<SectionHeader
					action={viewAll && <ViewAllLink href={viewAll} title={title} />}
					title={title}
				/>
			</View>
			<ScrollView
				contentContainerClassName="gap-4 px-4"
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</View>
	);
}

function ViewAllLink({ href, title }: { href: Href; title: string }) {
	return (
		<Pressable
			accessibilityLabel={`View all, ${title.toLocaleLowerCase()}`}
			accessibilityRole="link"
			className="h-11 justify-center active:opacity-60"
			hitSlop={{ left: 8 }}
			onPress={() => router.navigate(href)}
		>
			<Text className="text-sm font-medium text-muted-foreground">
				View all
			</Text>
		</Pressable>
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
			className="gap-2.5"
			style={{ width: concertWidth }}
		>
			<Artwork
				className="aspect-video"
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
