import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import type { AlbumCredit } from "@/lib/album";
import { useClearTabHistory } from "@/lib/navigation";
import { useArtworkUri } from "@/lib/offline/media";
import { getPartyAvatar } from "@/lib/party";

type CreditRowProps = {
	credit: AlbumCredit;
};

export function CreditRow({ credit }: CreditRowProps) {
	const avatarUrl = useArtworkUri(getPartyAvatar(credit.avatar));
	const clearTabHistory = useClearTabHistory();

	return (
		<Link
			asChild
			href={{
				pathname: "/parties/[id]",
				params: { id: String(credit.partyId) },
			}}
			onPress={(event) => clearTabHistory("parties", event)}
			push
			withAnchor
		>
			<Pressable
				accessibilityLabel={`${credit.name}, ${credit.creditType}`}
				accessibilityRole="link"
				className="flex-row items-center gap-3 py-2 active:opacity-70"
			>
				<View className="size-10 overflow-hidden rounded-full bg-muted">
					{avatarUrl ? (
						<Image
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
								size={18}
							/>
						</View>
					)}
				</View>
				<View className="flex-1">
					<Text
						className="text-sm font-medium text-foreground"
						numberOfLines={1}
					>
						{credit.name}
					</Text>
					<Text className="text-xs text-muted-foreground">
						{credit.creditType}
					</Text>
				</View>
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
	);
}
