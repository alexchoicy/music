import { router } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";

import { IconButton } from "@/components/ui/iconButton";

type DetailHeaderProps = {
	/** Shown at the trailing edge, e.g. a Select button. */
	action?: ReactNode;
};

/** Top bar for detail screens inside a tab's stack. */
export function DetailHeader({ action }: DetailHeaderProps) {
	return (
		<View className="flex-row items-center justify-between px-4 pt-3 pb-1">
			<IconButton
				className="border-transparent"
				icon={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
				label="Back"
				onPress={() => router.back()}
			/>
			{action}
		</View>
	);
}
