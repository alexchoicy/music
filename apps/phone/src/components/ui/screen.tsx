import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenProps = {
	children?: ReactNode;
};

export function Screen({ children }: ScreenProps) {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 bg-background"
			style={{
				paddingTop: insets.top,
				paddingLeft: insets.left,
				paddingRight: insets.right,
			}}
		>
			{children}
		</View>
	);
}
