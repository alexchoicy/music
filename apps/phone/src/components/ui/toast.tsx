import { useEffect } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { create } from "zustand";

const visibleMs = 4000;

type ToastState = {
	toast: { id: number; message: string } | null;
};

const useToastStore = create<ToastState>()(() => ({ toast: null }));
let nextId = 0;

/** Shows a short message above the tab bar; a newer message replaces it. */
export function showToast(message: string) {
	useToastStore.setState({ toast: { id: nextId++, message } });
	AccessibilityInfo.announceForAccessibility(message);
}

type ToastHostProps = {
	/** Distance from the bottom edge, e.g. to clear the navigation bar. */
	bottomOffset?: number;
};

/**
 * Renders the current toast. One sits above the tab bar; sheets render their
 * own, because a Modal covers the rest of the app.
 */
export function ToastHost({ bottomOffset = 8 }: ToastHostProps) {
	const toast = useToastStore((state) => state.toast);

	useEffect(() => {
		if (!toast) return;
		const timeout = setTimeout(() => {
			// Only hide the toast this timer was started for.
			if (useToastStore.getState().toast?.id === toast.id) {
				useToastStore.setState({ toast: null });
			}
		}, visibleMs);
		return () => clearTimeout(timeout);
	}, [toast]);

	return (
		<View
			className="absolute inset-x-0 items-center px-4"
			pointerEvents="none"
			style={{ bottom: bottomOffset }}
		>
			{toast && (
				<Animated.View
					className="max-w-md rounded-xl bg-foreground px-4 py-3"
					entering={FadeInDown.duration(200)}
					exiting={FadeOutDown.duration(150)}
					key={toast.id}
				>
					<Text className="text-sm text-background">{toast.message}</Text>
				</Animated.View>
			)}
		</View>
	);
}
