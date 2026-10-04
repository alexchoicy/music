import type { ReactNode } from "react";
import { Text, View } from "react-native";

type EmptyStateProps = {
	title: string;
	description: string;
	action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<View className="flex-1 items-center justify-center gap-1.5 p-6">
			<Text className="text-base font-medium text-foreground">{title}</Text>
			<Text className="text-center text-sm text-muted-foreground">
				{description}
			</Text>
			{action && <View className="pt-3">{action}</View>}
		</View>
	);
}
