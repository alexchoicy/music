import type { PressableProps } from "react-native";
import { Pressable, Text, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<PressableProps, "children"> & {
	icon: IconName;
	label: string;
	/** A count shown on the button, e.g. active filters. */
	badge?: number;
	variant?: "ghost" | "surface" | "primary";
	/** The button's diameter; the icon scales with it. */
	size?: number;
	iconSize?: number;
	/** A tint class for the icon, e.g. to mark an active toggle. */
	iconClassName?: string;
	className?: string;
};

const variants = {
	ghost: { container: "", tint: "accent-foreground" },
	surface: { container: "bg-surface", tint: "accent-foreground" },
	primary: { container: "bg-primary", tint: "accent-primary-foreground" },
};

export function IconButton({
	icon,
	label,
	badge,
	variant = "ghost",
	size = 44,
	iconSize = Math.round(size * 0.48),
	iconClassName,
	className,
	...props
}: IconButtonProps) {
	const styles = variants[variant];

	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="button"
			className={cn(
				"items-center justify-center rounded-full active:opacity-60 disabled:opacity-35",
				styles.container,
				className,
			)}
			hitSlop={size < 44 ? (44 - size) / 2 : undefined}
			style={{ width: size, height: size }}
			{...props}
		>
			<Icon
				className={iconClassName ?? styles.tint}
				name={icon}
				size={iconSize}
			/>
			{!!badge && (
				<View className="absolute -top-0.5 -right-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
					<Text className="text-[11px] font-bold text-primary-foreground">
						{badge}
					</Text>
				</View>
			)}
		</Pressable>
	);
}
