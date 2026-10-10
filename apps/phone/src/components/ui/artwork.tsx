import { Image } from "expo-image";
import { View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type ArtworkProps = {
	uri: string | null;
	/** Shown when there is no image. */
	icon?: IconName;
	/** A fixed size; without one the artwork fills its width as a square. */
	size?: number;
	shape?: "rounded" | "circle";
	recyclingKey?: string;
	accessibilityLabel?: string;
	className?: string;
};

export function Artwork({
	uri,
	icon = "album",
	size,
	shape = "rounded",
	recyclingKey,
	accessibilityLabel,
	className,
}: ArtworkProps) {
	return (
		<View
			accessibilityLabel={accessibilityLabel}
			accessibilityRole={accessibilityLabel ? "image" : undefined}
			accessible={!!accessibilityLabel}
			className={cn(
				"bg-surface-strong overflow-hidden",
				shape === "circle"
					? "rounded-full"
					: size && size < 64
						? "rounded-md"
						: "rounded-xl",
				!size && "aspect-square w-full",
				className,
			)}
			style={size ? { width: size, height: size } : undefined}
		>
			{uri ? (
				<Image
					// Grids scroll back over the same covers; memory skips decoding them again.
					cachePolicy="memory-disk"
					contentFit="cover"
					recyclingKey={recyclingKey}
					source={uri}
					style={{ width: "100%", height: "100%" }}
					transition={150}
				/>
			) : (
				<View className="flex-1 items-center justify-center">
					<Icon
						className="accent-muted-foreground"
						name={icon}
						size={size ? Math.max(14, size * 0.4) : 36}
					/>
				</View>
			)}
		</View>
	);
}
