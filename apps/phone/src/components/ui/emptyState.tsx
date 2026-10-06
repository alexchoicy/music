import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";

type EmptyStateProps = {
	icon?: IconName;
	title: string;
	description: string;
	action?: ReactNode;
};

export function EmptyState({
	icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<View className="flex-1 items-center justify-center gap-2 px-8 py-10">
			{icon && (
				<View className="mb-2 size-16 items-center justify-center rounded-full bg-surface">
					<Icon className="accent-muted-foreground" name={icon} size={28} />
				</View>
			)}
			<Text className="text-center text-lg font-semibold text-foreground">
				{title}
			</Text>
			<Text className="text-center text-sm leading-5 text-muted-foreground">
				{description}
			</Text>
			{action && <View className="pt-4">{action}</View>}
		</View>
	);
}
