import { Pressable, Text } from "react-native";

import { cn } from "@/lib/cn";

type ChipProps = {
	label: string;
	selected: boolean;
	onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked: selected }}
			className={cn(
				"h-9 justify-center rounded-full border px-3.5 active:opacity-70",
				selected ? "border-primary bg-primary" : "border-border bg-background",
			)}
			hitSlop={{ top: 4, bottom: 4 }}
			onPress={onPress}
		>
			<Text
				className={cn(
					"text-sm font-medium",
					selected ? "text-primary-foreground" : "text-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}
