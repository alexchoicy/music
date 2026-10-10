import { Text, View } from "react-native";

type BadgeProps = {
	label: string;
};

export function Badge({ label }: BadgeProps) {
	return (
		<View className="rounded-md bg-surface-strong px-1.5 py-0.5">
			<Text className="text-[11px] font-semibold text-muted-foreground">
				{label}
			</Text>
		</View>
	);
}
