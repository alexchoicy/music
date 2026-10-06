import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	useWindowDimensions,
	View,
} from "react-native";

import { AlbumCard } from "@/components/albums/albumCard";
import { Artwork } from "@/components/ui/artwork";
import { Backdrop } from "@/components/ui/backdrop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { SectionHeader, TopBar } from "@/components/ui/header";
import { Icon } from "@/components/ui/icon";
import { Loading } from "@/components/ui/loading";
import { Screen } from "@/components/ui/screen";
import { plural } from "@/lib/format";
import type { PartyAlbumSection } from "@/lib/music";
import {
	countryNames,
	getAvatar,
	getExternalInfoLabel,
	partyAlbumSections,
	partyKinds,
	partyTypes,
	toAlbumTile,
} from "@/lib/music";
import type { PartyDetails } from "@/lib/schema";
import { useArtworkUri } from "@/offline/offlineStore";
import { partyQueries } from "@/queries/parties";
import { useEndPadding } from "@/store/miniPlayerStore";

const descriptionLines = 4;
// Longer rows end with a See all link.
const previewCount = 10;

export default function PartyScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const party = useQuery(partyQueries.detail(id));
	const endPadding = useEndPadding(32);

	return (
		<Screen>
			{party.data && <PartyBackdrop party={party.data} />}
			<TopBar />
			{party.isPending ? (
				<Loading />
			) : party.data === undefined ? (
				<EmptyState
					action={
						<Button
							loading={party.isFetching}
							onPress={() => void party.refetch()}
							variant="secondary"
						>
							Try again
						</Button>
					}
					description="It may have been removed, or the server can't be reached."
					icon="person"
					title="Couldn't load party"
				/>
			) : (
				<ScrollView
					contentContainerClassName="gap-8"
					contentContainerStyle={{ paddingBottom: endPadding }}
					refreshControl={
						<RefreshControl
							colorsClassName="accent-muted-foreground"
							onRefresh={() => void party.refetch()}
							refreshing={party.isRefetching}
							tintColorClassName="accent-muted-foreground"
						/>
					}
				>
					<Hero party={party.data} />
					{party.data.albums.length === 0 &&
					party.data.appearsOnAlbums.length === 0 ? (
						<Text className="px-4 text-center text-sm text-muted-foreground">
							No albums in your library yet.
						</Text>
					) : (
						(["albums", "appears-on"] as const).map((section) => (
							<AlbumRow key={section} party={party.data} section={section} />
						))
					)}
				</ScrollView>
			)}
		</Screen>
	);
}

function PartyBackdrop({ party }: { party: PartyDetails }) {
	const { width } = useWindowDimensions();
	const avatarUri = useArtworkUri(getAvatar(party.avatarImages));
	return <Backdrop height={Math.min(width, 420)} uri={avatarUri} />;
}

function Hero({ party }: { party: PartyDetails }) {
	const [expanded, setExpanded] = useState(false);
	const [truncated, setTruncated] = useState(false);
	const avatarUri = useArtworkUri(getAvatar(party.avatarImages));
	const description = party.description.trim();
	const badges = [
		partyTypes.find((type) => type.value === party.type)?.label,
		partyKinds.find((kind) => kind.value === party.kind)?.label,
		party.gender && party.gender !== "Unknown" ? party.gender : undefined,
	].filter((label) => label !== undefined);
	const meta = [
		party.country !== "XX" ? countryNames[party.country] : null,
		plural(party.albums.length, "album"),
	].filter(Boolean);
	const aliases = party.aliases
		.map((alias) => alias.name)
		.filter((name) => name !== party.name);

	return (
		<View className="gap-5">
			<View className="items-center gap-4 px-4">
				<Artwork
					accessibilityLabel={`${party.name} avatar`}
					icon="person"
					shape="circle"
					size={152}
					uri={avatarUri}
				/>
				<View className="w-full items-center gap-2">
					<Text
						accessibilityRole="header"
						className="text-center text-2xl font-bold tracking-tight text-foreground"
					>
						{party.name}
					</Text>
					{badges.length > 0 && (
						<View className="flex-row flex-wrap justify-center gap-1.5">
							{badges.map((badge) => (
								<Badge key={badge} label={badge} />
							))}
						</View>
					)}
					<Text className="text-center text-sm text-muted-foreground">
						{meta.join(" · ")}
					</Text>
					{aliases.length > 0 && (
						<Text className="text-center text-sm text-muted-foreground">
							Also known as {aliases.join(", ")}
						</Text>
					)}
				</View>
			</View>

			{!!description && (
				<View className="gap-1 px-4">
					{/* Android reports only visible lines, so a hidden unclamped copy measures the full text. */}
					<Text
						aria-hidden
						className="absolute inset-x-4 top-0 text-sm leading-5 opacity-0"
						importantForAccessibility="no-hide-descendants"
						onTextLayout={(event) =>
							setTruncated(event.nativeEvent.lines.length > descriptionLines)
						}
					>
						{description}
					</Text>
					<Text
						className="text-sm leading-5 text-muted-foreground"
						numberOfLines={expanded ? undefined : descriptionLines}
					>
						{description}
					</Text>
					{truncated && (
						<Pressable
							accessibilityRole="button"
							className="self-start py-1 active:opacity-60"
							hitSlop={8}
							onPress={() => setExpanded((value) => !value)}
						>
							<Text className="text-sm font-semibold text-foreground">
								{expanded ? "Show less" : "Show more"}
							</Text>
						</Pressable>
					)}
				</View>
			)}

			{party.externalInfoLinks.length > 0 && (
				<ScrollView
					contentContainerClassName="gap-2 px-4"
					horizontal
					showsHorizontalScrollIndicator={false}
				>
					{party.externalInfoLinks.map((link) => {
						const label = getExternalInfoLabel(link, party.externalInfoLinks);
						return (
							<Pressable
								accessibilityHint="Opens in your browser"
								accessibilityLabel={label}
								accessibilityRole="link"
								hitSlop={{ top: 6, bottom: 6 }}
								className="h-9 flex-row items-center gap-1.5 rounded-full bg-surface px-4 active:opacity-60"
								key={`${link.type}-${link.url}`}
								onPress={() => void Linking.openURL(link.url)}
							>
								<Text className="text-sm font-medium text-foreground">
									{label}
								</Text>
								<Icon
									className="accent-muted-foreground"
									name="externalLink"
									size={14}
								/>
							</Pressable>
						);
					})}
				</ScrollView>
			)}
		</View>
	);
}

function AlbumRow({
	party,
	section,
}: {
	party: PartyDetails;
	section: PartyAlbumSection;
}) {
	const { title, field } = partyAlbumSections[section];
	const albums = party[field];
	if (albums.length === 0) return null;

	return (
		<View className="gap-2">
			<View className="px-4">
				<SectionHeader
					action={
						albums.length > previewCount && (
							<Link
								asChild
								href={{
									pathname: "/party/[id]/[section]",
									params: { id: String(party.partyId), section },
								}}
								push
							>
								<Pressable
									accessibilityLabel={`See all ${albums.length} ${title.toLocaleLowerCase()}`}
									accessibilityRole="link"
									className="h-11 flex-row items-center gap-0.5 active:opacity-60"
									hitSlop={{ left: 8 }}
								>
									<Text className="text-sm font-semibold text-primary">
										See all
									</Text>
									<Icon
										className="accent-primary"
										name="chevronRight"
										size={16}
									/>
								</Pressable>
							</Link>
						)
					}
					detail={String(albums.length)}
					title={title}
				/>
			</View>
			<ScrollView
				contentContainerClassName="gap-3.5 px-4"
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{albums.slice(0, previewCount).map((album) => (
					<AlbumCard
						album={toAlbumTile(album)}
						key={album.albumId}
						width={144}
					/>
				))}
			</ScrollView>
		</View>
	);
}
