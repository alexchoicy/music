import { Pressable, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type ToggleButtonProps = {
	icon: IconName;
	label: string;
	active: boolean;
	onPress: () => void;
	/** Announced as an on/off switch; repeat cycles three modes, so it is a button. */
	role?: "switch" | "button";
	size?: number;
};

/** A player toggle such as Shuffle; on, it turns the accent color and shows a dot. */
export function ToggleButton({
	icon,
	label,
	active,
	onPress,
	role = "switch",
	size = 24,
}: ToggleButtonProps) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole={role}
			accessibilityState={role === "switch" ? { checked: active } : undefined}
			className="size-12 items-center justify-center rounded-full active:opacity-60"
			onPress={onPress}
		>
			<Icon
				className={active ? "accent-primary" : "accent-muted-foreground"}
				name={icon}
				size={size}
			/>
			{/* The dot marks an active toggle without relying on color alone. */}
			<View
				className={cn(
					"absolute bottom-1 size-1 rounded-full bg-primary",
					!active && "opacity-0",
				)}
			/>
		</Pressable>
	);
}
