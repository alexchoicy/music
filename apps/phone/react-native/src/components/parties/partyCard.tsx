import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/format";
import { countryNames, partyKinds, partyTypes } from "@/lib/music";
import type { PartyListItem } from "@/lib/schema";

type PartyCardProps = {
	party: PartyListItem;
	width: number;
	/** The library grid also shows the kind and counts albums instead of releases. */
	variant?: "home" | "library";
};

export function PartyCard({ party, width, variant = "home" }: PartyCardProps) {
	const isLibrary = variant === "library";
	const albumCount = Number(party.albumCount);
	const count = isLibrary
		? albumCount === 0
			? "No albums"
			: plural(albumCount, "album")
		: plural(albumCount, "release");
	const kind =
		isLibrary && party.kind !== "Human"
			? partyKinds.find((option) => option.value === party.kind)?.label
			: undefined;
	// Unknowns are left out rather than spelled out.
	const meta = [
		party.country !== "XX" ? countryNames[party.country] : null,
		partyTypes.find((option) => option.value === party.type)?.label,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Link
			asChild
			href={{ pathname: "/party/[id]", params: { id: String(party.partyId) } }}
			push
		>
			<Pressable
				accessibilityLabel={[party.name, kind, meta, count]
					.filter(Boolean)
					.join(", ")}
				accessibilityRole="link"
				className="items-center gap-2.5 active:opacity-70"
				style={{ width }}
			>
				<View className="w-full">
					<Artwork
						icon="person"
						recyclingKey={String(party.partyId)}
						shape="circle"
						uri={party.coverUrl || null}
					/>
					{kind && (
						<View className="absolute inset-x-0 -bottom-3 items-center">
							<Badge label={kind} size="tag" variant="artwork" />
						</View>
					)}
				</View>
				<View className={cn("w-full items-center", kind && "mt-3")}>
					<Text
						className="text-center text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{party.name}
					</Text>
					{!!meta && (
						<Text
							className="text-center text-xs text-muted-foreground"
							numberOfLines={1}
						>
							{meta}
						</Text>
					)}
					<Text
						className="text-center text-xs text-muted-foreground"
						numberOfLines={1}
					>
						{count}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
