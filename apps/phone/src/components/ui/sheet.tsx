import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

type SheetProps = {
	open: boolean;
	title: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
};

const openTiming = { duration: 280, easing: Easing.out(Easing.cubic) };
const closeTiming = { duration: 200, easing: Easing.in(Easing.cubic) };
const dismissDistanceRatio = 0.25;
const dismissVelocity = 800;

export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();
	// The Modal stays mounted until the close animation finishes.
	const [mounted, setMounted] = useState(open);
	const progress = useSharedValue(0);
	const dragY = useSharedValue(0);
	const sheetHeight = useSharedValue(windowHeight);

	useEffect(() => {
		if (open) {
			setMounted(true);
			dragY.value = 0;
			progress.value = withTiming(1, openTiming);
		} else {
			progress.value = withTiming(0, closeTiming, (finished) => {
				if (finished) scheduleOnRN(setMounted, false);
			});
		}
	}, [open, progress, dragY]);

	const pan = Gesture.Pan()
		.onUpdate((event) => {
			dragY.value = Math.max(0, event.translationY);
		})
		.onEnd((event) => {
			if (
				dragY.value > sheetHeight.value * dismissDistanceRatio ||
				event.velocityY > dismissVelocity
			) {
				scheduleOnRN(onClose);
			} else {
				dragY.value = withSpring(0, { damping: 30, stiffness: 300 });
			}
		});

	const backdropStyle = useAnimatedStyle(() => ({
		opacity:
			progress.value * (1 - Math.min(1, dragY.value / sheetHeight.value)),
	}));
	const sheetStyle = useAnimatedStyle(() => ({
		transform: [
			{
				translateY: (1 - progress.value) * sheetHeight.value + dragY.value,
			},
		],
	}));

	return (
		<Modal
			animationType="none"
			navigationBarTranslucent
			onRequestClose={onClose}
			statusBarTranslucent
			transparent
			visible={mounted}
		>
			{/* A Modal is a separate native root, so gestures need their own root view. */}
			<GestureHandlerRootView style={styles.root}>
				<Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
					<Pressable
						accessibilityLabel={`Close ${title}`}
						accessibilityRole="button"
						className="flex-1 bg-black/40"
						onPress={onClose}
					/>
				</Animated.View>
				<Animated.View
					onLayout={(event) => {
						sheetHeight.value = event.nativeEvent.layout.height;
					}}
					style={[{ maxHeight: "80%" }, sheetStyle]}
				>
					<View
						className="shrink rounded-t-2xl border border-border bg-background"
						style={{ paddingBottom: insets.bottom + 16 }}
					>
						<GestureDetector gesture={pan}>
							<View>
								<View className="items-center pt-2">
									<View className="h-1 w-10 rounded-full bg-muted-foreground/30" />
								</View>
								<Text
									accessibilityRole="header"
									className="px-5 pt-3 pb-2 text-lg font-semibold text-foreground"
								>
									{title}
								</Text>
							</View>
						</GestureDetector>
						<ScrollView contentContainerClassName="gap-5 px-5 pb-4">
							{children}
						</ScrollView>
						{footer && <View className="flex-row gap-3 px-5">{footer}</View>}
					</View>
				</Animated.View>
			</GestureHandlerRootView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, justifyContent: "flex-end" },
});
