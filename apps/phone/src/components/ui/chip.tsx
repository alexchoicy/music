import { Pressable, Text } from "react-native";

import { cn } from "@/lib/cn";

type ChipProps = {
	label: string;
	selected: boolean;
	onPress: () => void;
	role?: "checkbox" | "radio";
};

export function Chip({
	label,
	selected,
	onPress,
	role = "checkbox",
}: ChipProps) {
	return (
		<Pressable
			accessibilityRole={role}
			accessibilityState={{ checked: selected }}
			className={cn(
				"h-9 justify-center rounded-full px-4 active:opacity-70",
				selected ? "bg-foreground" : "bg-surface",
			)}
			hitSlop={{ top: 4, bottom: 4 }}
			onPress={onPress}
		>
			<Text
				className={cn(
					"text-sm font-medium",
					selected ? "text-background" : "text-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}
