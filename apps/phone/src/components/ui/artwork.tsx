import { Image } from "expo-image";
import { View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { ShadowName } from "@/lib/shadows";
import { useShadow } from "@/lib/shadows";

type ArtworkProps = {
	uri: string | null;
	/** Shown when there is no image. */
	icon?: IconName;
	/** A fixed size; without one the artwork fills its width as a square. */
	size?: number;
	shape?: "rounded" | "circle";
	recyclingKey?: string;
	accessibilityLabel?: string;
	/** A shadow around the artwork, e.g. `pop` for a hero cover. */
	elevation?: ShadowName;
	/** Overrides the corner radius, e.g. `rounded-4xl` for a hero cover. */
	radiusClassName?: string;
	className?: string;
};

export function Artwork({
	uri,
	icon = "album",
	size,
	shape = "rounded",
	recyclingKey,
	accessibilityLabel,
	elevation,
	radiusClassName,
	className,
}: ArtworkProps) {
	const shadow = useShadow(elevation ?? "pop");
	const radius =
		radiusClassName ??
		(shape === "circle"
			? "rounded-full"
			: size && size < 64
				? "rounded-lg"
				: "rounded-xl");

	const artwork = (
		<View
			accessibilityLabel={accessibilityLabel}
			accessibilityRole={accessibilityLabel ? "image" : undefined}
			accessible={!!accessibilityLabel}
			className={cn(
				"overflow-hidden bg-muted",
				radius,
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
			{/* A faint edge keeps dark artwork apart from the dark canvas. */}
			<View
				className={cn("absolute inset-0 border border-white/8", radius)}
				pointerEvents="none"
			/>
		</View>
	);
	if (!elevation) return artwork;

	// The shadow sits on a wrapper, since the artwork clips its contents.
	return (
		<View className={cn("self-start", radius)} style={shadow}>
			{artwork}
		</View>
	);
}
