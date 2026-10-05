import type { components } from "@api/schema";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";

type PartyCardProps = {
	party: components["schemas"]["PartyItems"];
};

export function PartyCard({ party }: PartyCardProps) {
	const albumCount = Number(party.albumCount);
	const albumLabel = `${albumCount} ${albumCount === 1 ? "release" : "releases"}`;

	return (
		<Link
			asChild
			href={{
				pathname: "/parties/[id]",
				params: { id: String(party.partyId) },
			}}
			push
			withAnchor
		>
			<Pressable
				accessibilityLabel={`${party.name}, ${albumLabel}`}
				accessibilityRole="link"
				className="flex-1 items-center gap-1.5 active:opacity-70"
			>
				<View className="aspect-square w-full overflow-hidden rounded-full bg-muted">
					{party.coverUrl ? (
						<Image
							contentFit="cover"
							recyclingKey={String(party.partyId)}
							source={party.coverUrl}
							style={{ width: "100%", height: "100%" }}
							transition={150}
						/>
					) : (
						<View className="flex-1 items-center justify-center">
							<Icon
								className="accent-muted-foreground"
								name={{ ios: "person.fill", android: "person", web: "person" }}
								size={28}
							/>
						</View>
					)}
				</View>
				<View className="w-full items-center">
					<Text
						className="text-center text-xs font-medium text-foreground"
						numberOfLines={1}
					>
						{party.name}
					</Text>
					<Text
						className="text-center text-[11px] text-muted-foreground"
						numberOfLines={1}
					>
						{albumLabel}
					</Text>
				</View>
			</Pressable>
		</Link>
	);
}
