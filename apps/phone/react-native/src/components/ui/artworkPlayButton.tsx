import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator, Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useShadow } from "@/lib/shadows";

type ArtworkPlayButtonProps = {
	label: string;
	onPlay: () => Promise<void>;
	className?: string;
	style?: StyleProp<ViewStyle>;
};

/** The round play button over a tile's artwork; always shown on touch screens. */
export function ArtworkPlayButton({
	label,
	onPlay,
	className,
	style,
}: ArtworkPlayButtonProps) {
	const [loading, setLoading] = useState(false);
	const shadow = useShadow("pop");

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ busy: loading }}
			className={cn(
				"size-10 items-center justify-center rounded-full bg-primary active:opacity-80",
				className,
			)}
			disabled={loading}
			hitSlop={2}
			style={[shadow, style]}
			onPress={() => {
				setLoading(true);
				void onPlay().finally(() => setLoading(false));
			}}
		>
			{loading ? (
				<ActivityIndicator colorClassName="accent-primary-foreground" />
			) : (
				<Icon className="accent-primary-foreground" name="play" size={18} />
			)}
		</Pressable>
	);
}
