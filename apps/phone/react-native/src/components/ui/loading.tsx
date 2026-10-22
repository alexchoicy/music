import { ActivityIndicator, View } from "react-native";

export function Loading() {
	return (
		<View className="flex-1 items-center justify-center">
			<ActivityIndicator colorClassName="accent-muted-foreground" />
		</View>
	);
}
