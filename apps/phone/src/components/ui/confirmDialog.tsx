import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { create } from "zustand";

import { Button } from "@/components/ui/button";
import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";

type ConfirmOptions = {
	title: string;
	message: string;
	confirmLabel: string;
	cancelLabel?: string;
	icon?: IconName;
	onConfirm: () => void;
};

const useConfirmStore = create<{ request: ConfirmOptions | null }>()(() => ({
	request: null,
}));

/** Asks before a destructive action, e.g. deleting a playlist. */
export function confirm(options: ConfirmOptions) {
	useConfirmStore.setState({ request: options });
}

function dismiss() {
	useConfirmStore.setState({ request: null });
}

const openTiming = { duration: 200, easing: Easing.out(Easing.cubic) };
const closeTiming = { duration: 150, easing: Easing.in(Easing.cubic) };

/** Shows the dialog requested by `confirm`; mounted once at the root. */
export function ConfirmDialogHost() {
	const request = useConfirmStore((state) => state.request);
	const insets = useSafeAreaInsets();
	// Keeps the content and Modal while the dialog fades out.
	const [shown, setShown] = useState(request);
	if (request && request !== shown) setShown(request);
	const [mounted, setMounted] = useState(false);
	const progress = useSharedValue(0);

	useEffect(() => {
		if (request) {
			setMounted(true);
			progress.value = withTiming(1, openTiming);
		} else {
			progress.value = withTiming(0, closeTiming, (finished) => {
				if (finished) scheduleOnRN(setMounted, false);
			});
		}
	}, [request, progress]);

	const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
	const dialogStyle = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{ scale: 0.94 + progress.value * 0.06 }],
	}));

	if (!shown) return null;

	return (
		<Modal
			animationType="none"
			navigationBarTranslucent
			onRequestClose={dismiss}
			statusBarTranslucent
			transparent
			visible={mounted}
		>
			<View
				className="flex-1 items-center justify-center px-6"
				style={{
					paddingTop: insets.top + 24,
					paddingBottom: insets.bottom + 24,
				}}
			>
				<Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
					{/* Screen readers dismiss with the Cancel button instead. */}
					<Pressable
						accessible={false}
						className="flex-1 bg-scrim"
						importantForAccessibility="no"
						onPress={dismiss}
					/>
				</Animated.View>
				<Animated.View
					accessibilityViewIsModal
					className="max-h-full w-full max-w-sm gap-5 rounded-3xl bg-background p-6"
					style={dialogStyle}
				>
					{/* Long text scrolls so the buttons stay reachable. */}
					<ScrollView
						contentContainerClassName="items-center gap-5"
						style={{ flexGrow: 0 }}
					>
						<View className="size-14 items-center justify-center rounded-full bg-surface">
							<Icon
								className="accent-destructive"
								name={shown.icon ?? "delete"}
								size={26}
							/>
						</View>
						<View className="items-center gap-2">
							<Text
								accessibilityRole="header"
								className="text-center text-xl font-bold text-foreground"
							>
								{shown.title}
							</Text>
							<Text className="text-center text-base text-muted-foreground">
								{shown.message}
							</Text>
						</View>
					</ScrollView>
					<View className="w-full gap-2">
						<Button
							onPress={() => {
								dismiss();
								shown.onConfirm();
							}}
							variant="destructiveFilled"
						>
							{shown.confirmLabel}
						</Button>
						<Button onPress={dismiss} variant="ghost">
							{shown.cancelLabel ?? "Cancel"}
						</Button>
					</View>
				</Animated.View>
			</View>
		</Modal>
	);
}
