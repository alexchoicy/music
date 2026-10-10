import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Artwork } from "@/components/ui/artwork";
import { plural } from "@/lib/format";
import type { PartyListItem } from "@/lib/schema";

type PartyCardProps = {
	party: PartyListItem;
	width?: number;
};

export function PartyCard({ party, width }: PartyCardProps) {
	const releases = plural(party.albumCount, "release");

	return (
		<Link
			asChild
			href={{ pathname: "/party/[id]", params: { id: String(party.partyId) } }}
			push
		>
			<Pressable
				accessibilityLabel={`${party.name}, ${releases}`}
				accessibilityRole="link"
				className="items-center gap-2 active:opacity-70"
				style={width ? { width } : undefined}
			>
				<Artwork
					icon="person"
					recyclingKey={String(party.partyId)}
					shape="circle"
					uri={party.coverUrl || null}
				/>
				<View className="w-full items-center">
					<Text
						className="text-center text-sm font-semibold text-foreground"
						numberOfLines={1}
					>
						{party.name}
					</Text>
					<Text
						className="text-center text-xs text-muted-foreground"
						numberOfLines={1}
					>
						{releases}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
