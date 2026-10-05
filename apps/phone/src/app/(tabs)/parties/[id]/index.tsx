import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";

import { AlbumCard } from "@/components/albums/albumCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailHeader } from "@/components/ui/detailHeader";
import { EmptyState } from "@/components/ui/emptyState";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { useArtworkUri } from "@/lib/offline/media";
import type { PartyAlbumSection, PartyDetails } from "@/lib/party";
import {
	countryNames,
	getExternalInfoLabel,
	getPartyAvatar,
	partyAlbumSections,
	partyKinds,
	partyTypes,
} from "@/lib/party";
import { partyQueries } from "@/lib/queries/party.queries";

const avatarSize = 128;
const descriptionLines = 4;
const columns = 3;
// Two rows; longer lists open the See all screen.
const previewCount = 6;

export default function PartyDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const party = useQuery(partyQueries.getParty(id));
	return (
		<Screen>
			<DetailHeader />
			{party.isPending ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator colorClassName="accent-muted-foreground" />
				</View>
			) : party.data === undefined ? (
				<EmptyState
					action={
						<Button
							loading={party.isFetching}
							onPress={() => void party.refetch()}
							variant="outline"
						>
							Retry
						</Button>
					}
					description="It may have been removed, or the server is unreachable."
					title="Unable to load party"
				/>
			) : (
				<ScrollView
					contentContainerClassName="gap-8 pt-2 pb-6"
					refreshControl={
						<RefreshControl
							colorsClassName="accent-muted-foreground"
							onRefresh={() => void party.refetch()}
							refreshing={party.isRefetching}
							tintColorClassName="accent-muted-foreground"
						/>
					}
				>
					<PartyHero party={party.data} />
					{party.data.albums.length === 0 &&
					party.data.appearsOnAlbums.length === 0 ? (
						<Text className="px-4 text-center text-sm text-muted-foreground">
							No albums in your library yet.
						</Text>
					) : (
						<>
							<AlbumSection
								albums={party.data.albums}
								partyId={party.data.partyId}
								section="albums"
							/>
							<AlbumSection
								albums={party.data.appearsOnAlbums}
								partyId={party.data.partyId}
								section="appears-on"
							/>
						</>
					)}
				</ScrollView>
			)}
		</Screen>
	);
}

function PartyHero({ party }: { party: PartyDetails }) {
	const [descriptionExpanded, setDescriptionExpanded] = useState(false);
	const [descriptionTruncated, setDescriptionTruncated] = useState(false);
	const avatarUrl = useArtworkUri(getPartyAvatar(party.avatarImages));
	const description = party.description.trim();
	const badges = [
		partyTypes.find((type) => type.value === party.type)?.label,
		partyKinds.find((kind) => kind.value === party.kind)?.label,
		party.gender && party.gender !== "Unknown" ? party.gender : undefined,
	].filter((label): label is string => !!label);
	const meta = [
		party.country !== "XX" ? countryNames[party.country] : null,
		`${party.albums.length} ${party.albums.length === 1 ? "album" : "albums"}`,
	].filter(Boolean);
	const aliases = party.aliases
		.map((alias) => alias.name)
		.filter((name) => name !== party.name);

	return (
		<View className="gap-4">
			<View className="items-center gap-3 px-4">
				<View
					className="overflow-hidden rounded-full bg-muted"
					style={{ width: avatarSize, height: avatarSize }}
				>
					{avatarUrl ? (
						<Image
							accessibilityLabel={`${party.name} avatar`}
							contentFit="cover"
							source={avatarUrl}
							style={{ width: "100%", height: "100%" }}
							transition={150}
						/>
					) : (
						<View className="flex-1 items-center justify-center">
							<Icon
								className="accent-muted-foreground"
								name={{ ios: "person.fill", android: "person", web: "person" }}
								size={48}
							/>
						</View>
					)}
				</View>
				<View className="w-full items-center gap-1.5">
					<Text
						accessibilityRole="header"
						className="text-center text-xl font-semibold text-foreground"
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
					<Text className="text-center text-xs text-muted-foreground">
						{meta.join(" · ")}
					</Text>
					{aliases.length > 0 && (
						<Text className="text-center text-xs text-muted-foreground">
							Also known as {aliases.join(", ")}
						</Text>
					)}
				</View>
			</View>

			{!!description && (
				<View className="gap-1 px-4">
					{/* Android reports only the visible lines, so an unclamped hidden copy measures the full text. */}
					<Text
						aria-hidden
						className="absolute inset-x-4 top-0 text-sm leading-5 opacity-0"
						importantForAccessibility="no-hide-descendants"
						onTextLayout={(event) =>
							setDescriptionTruncated(
								event.nativeEvent.lines.length > descriptionLines,
							)
						}
					>
						{description}
					</Text>
					<Text
						className="text-sm leading-5 text-muted-foreground"
						numberOfLines={descriptionExpanded ? undefined : descriptionLines}
					>
						{description}
					</Text>
					{descriptionTruncated && (
						<Pressable
							accessibilityRole="button"
							className="self-start py-1 active:opacity-70"
							hitSlop={8}
							onPress={() => setDescriptionExpanded((expanded) => !expanded)}
						>
							<Text className="text-sm font-medium text-foreground">
								{descriptionExpanded ? "Show less" : "Show more"}
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
								className="h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3.5 active:opacity-70"
								key={`${link.type}-${link.url}`}
								onPress={() => void Linking.openURL(link.url)}
							>
								<Text className="text-sm font-medium text-foreground">
									{label}
								</Text>
								<Icon
									className="accent-muted-foreground"
									name={{
										ios: "arrow.up.right",
										android: "open_in_new",
										web: "open_in_new",
									}}
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

type AlbumSectionProps = {
	partyId: PartyDetails["partyId"];
	section: PartyAlbumSection;
	albums: PartyDetails["albums"];
};

function AlbumSection({ partyId, section, albums }: AlbumSectionProps) {
	if (albums.length === 0) return null;

	const { title } = partyAlbumSections[section];
	const preview = albums.slice(0, previewCount);
	const rows = Array.from(
		{ length: Math.ceil(preview.length / columns) },
		(_, index) => preview.slice(index * columns, (index + 1) * columns),
	);

	return (
		<View className="gap-3 px-4">
			<View className="min-h-11 flex-row items-center justify-between">
				<Text
					accessibilityRole="header"
					className="text-base font-semibold text-foreground"
				>
					{title}
				</Text>
				{albums.length > previewCount ? (
					<Link
						asChild
						href={{
							pathname: "/parties/[id]/[section]",
							params: { id: String(partyId), section },
						}}
						push
					>
						<Pressable
							accessibilityLabel={`See all ${albums.length} ${title.toLocaleLowerCase()}`}
							accessibilityRole="link"
							className="h-11 flex-row items-center gap-0.5 active:opacity-70"
							hitSlop={{ left: 8 }}
						>
							<Text className="text-sm font-medium text-muted-foreground">
								See all ({albums.length})
							</Text>
							<Icon
								className="accent-muted-foreground"
								name={{
									ios: "chevron.right",
									android: "chevron_right",
									web: "chevron_right",
								}}
								size={16}
							/>
						</Pressable>
					</Link>
				) : (
					<Text className="text-xs text-muted-foreground">{albums.length}</Text>
				)}
			</View>
			<View className="gap-4">
				{rows.map((row) => (
					<View className="flex-row gap-3" key={row[0].albumId}>
						{row.map((album) => (
							<View className="flex-1" key={album.albumId}>
								<AlbumCard album={album} />
							</View>
						))}
						{/* Spacers keep a short last row aligned to the grid. */}
						{Array.from({ length: columns - row.length }, (_, index) => (
							<View className="flex-1" key={index} />
						))}
					</View>
				))}
			</View>
		</View>
	);
}
