import { Text, View } from "react-native";

type BadgeProps = {
	label: string;
};

export function Badge({ label }: BadgeProps) {
	return (
		<View className="rounded-full bg-muted px-2 py-0.5">
			<Text className="text-[11px] font-medium text-muted-foreground">
				{label}
			</Text>
		</View>
	);
}
