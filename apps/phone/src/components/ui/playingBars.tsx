import { View } from "react-native";

/** Marks the item playing now, next to its primary-colored title. */
export function PlayingBars() {
	return (
		<View
			accessibilityElementsHidden
			className="h-3 flex-row items-end gap-0.5"
			importantForAccessibility="no-hide-descendants"
		>
			<View className="h-[7px] w-0.5 rounded-[1px] bg-primary" />
			<View className="h-3 w-0.5 rounded-[1px] bg-primary" />
			<View className="h-[9px] w-0.5 rounded-[1px] bg-primary" />
		</View>
	);
}
