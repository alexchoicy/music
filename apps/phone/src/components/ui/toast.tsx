import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { useToastStore } from "@/store/toastStore";

const visibleMs = 4000;

type ToastHostProps = {
	/** Distance from the bottom edge, e.g. to clear the navigation bar. */
	bottomOffset?: number;
	/** Places the toast just above its parent, e.g. the tab bar. */
	aboveParent?: boolean;
};

/**
 * Renders the current toast. One sits above the tab bar; sheets render their
 * own, because a Modal covers the rest of the app.
 */
export function ToastHost({ bottomOffset = 8, aboveParent }: ToastHostProps) {
	const toast = useToastStore((state) => state.toast);

	useEffect(() => {
		if (!toast) return;
		const timeout = setTimeout(() => {
			// Only hides the toast this timer was started for.
			if (useToastStore.getState().toast?.id === toast.id) {
				useToastStore.setState({ toast: null });
			}
		}, visibleMs);
		return () => clearTimeout(timeout);
	}, [toast]);

	return (
		<View
			className="absolute inset-x-0 z-10 items-center px-4"
			pointerEvents="none"
			style={
				aboveParent
					? { bottom: "100%", marginBottom: 8 }
					: { bottom: bottomOffset }
			}
		>
			{toast && (
				<Animated.View
					className="max-w-md rounded-2xl bg-foreground px-4 py-3"
					entering={FadeInDown.duration(200)}
					exiting={FadeOutDown.duration(150)}
					key={toast.id}
				>
					<Text className="text-sm font-medium text-background">
						{toast.message}
					</Text>
				</Animated.View>
			)}
		</View>
	);
}
