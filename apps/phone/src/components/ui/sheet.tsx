import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
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

import type { IconName } from "@/components/ui/icon";
import { Icon } from "@/components/ui/icon";
import { ToastHost } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useKeyboardVisible } from "@/lib/hooks";

type SheetProps = {
	open: boolean;
	title: string;
	/** A line under the title, e.g. the track an action applies to. */
	description?: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
};

const openTiming = { duration: 280, easing: Easing.out(Easing.cubic) };
const closeTiming = { duration: 200, easing: Easing.in(Easing.cubic) };
const dismissDistanceRatio = 0.25;
const dismissVelocity = 800;

/** A panel that slides up from the bottom; drag it down or tap outside to close. */
export function Sheet({
	open,
	title,
	description,
	onClose,
	children,
	footer,
}: SheetProps) {
	const insets = useSafeAreaInsets();
	const keyboardVisible = useKeyboardVisible();
	// The Modal stays mounted until the close animation finishes.
	const [mounted, setMounted] = useState(open);
	const progress = useSharedValue(0);
	const dragY = useSharedValue(0);
	const sheetHeight = useSharedValue(1000);

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
			{ translateY: (1 - progress.value) * sheetHeight.value + dragY.value },
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
				{/* Lifts the sheet above the keyboard when it has a text field. */}
				<KeyboardAvoidingView behavior="padding" style={styles.content}>
					<Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
						<Pressable
							accessibilityLabel={`Close ${title}`}
							accessibilityRole="button"
							className="flex-1 bg-scrim"
							onPress={onClose}
						/>
					</Animated.View>
					<Animated.View
						onLayout={(event) => {
							sheetHeight.value = event.nativeEvent.layout.height;
						}}
						style={[{ maxHeight: "85%" }, sheetStyle]}
					>
						<View
							className="shrink rounded-t-3xl bg-background"
							style={{
								// The keyboard covers the navigation bar.
								paddingBottom: keyboardVisible ? 12 : insets.bottom + 12,
								paddingLeft: insets.left,
								paddingRight: insets.right,
							}}
						>
							<GestureDetector gesture={pan}>
								<View className="px-5 pb-3">
									<View className="items-center py-2.5">
										<View className="h-1 w-9 rounded-full bg-surface-strong" />
									</View>
									<Text
										accessibilityRole="header"
										className="text-lg font-bold text-foreground"
										numberOfLines={2}
									>
										{title}
									</Text>
									{description && (
										<Text
											className="text-sm text-muted-foreground"
											numberOfLines={1}
										>
											{description}
										</Text>
									)}
								</View>
							</GestureDetector>
							<ScrollView
								contentContainerClassName="gap-5 px-5 pb-3"
								keyboardShouldPersistTaps="handled"
							>
								{children}
								{/* With the keyboard up, the footer scrolls so short screens keep the fields visible. */}
								{footer && keyboardVisible && (
									<View className="flex-row gap-3">{footer}</View>
								)}
							</ScrollView>
							{footer && !keyboardVisible && (
								<View className="flex-row gap-3 px-5 pt-2">{footer}</View>
							)}
						</View>
					</Animated.View>
				</KeyboardAvoidingView>
				<ToastHost bottomOffset={insets.bottom + 8} />
			</GestureHandlerRootView>
		</Modal>
	);
}

type SheetActionProps = {
	icon: IconName;
	label: string;
	onPress: () => void;
	destructive?: boolean;
	disabled?: boolean;
};

/** An action in a sheet's list, e.g. Play next. */
export function SheetAction({
	icon,
	label,
	onPress,
	destructive,
	disabled,
}: SheetActionProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled: !!disabled }}
			className="min-h-13 flex-row items-center gap-4 active:opacity-60 disabled:opacity-40"
			disabled={disabled}
			onPress={onPress}
		>
			<Icon
				className={destructive ? "accent-destructive" : "accent-foreground"}
				name={icon}
				size={22}
			/>
			<Text
				className={cn(
					"flex-1 text-base",
					destructive ? "text-destructive" : "text-foreground",
				)}
			>
				{label}
			</Text>
		</Pressable>
	);
}

type RadioRowProps = {
	label: string;
	selected: boolean;
	onPress: () => void;
};

/** One option of a single choice in a sheet. */
export function RadioRow({ label, selected, onPress }: RadioRowProps) {
	return (
		<Pressable
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			className="min-h-12 flex-row items-center gap-3 active:opacity-60"
			onPress={onPress}
		>
			<Text
				className={cn(
					"flex-1 text-base",
					selected ? "font-semibold text-foreground" : "text-foreground",
				)}
			>
				{label}
			</Text>
			<View
				className={cn(
					"size-5.5 items-center justify-center rounded-full border-2",
					selected ? "border-primary" : "border-surface-strong",
				)}
			>
				{selected && <View className="size-2.5 rounded-full bg-primary" />}
			</View>
		</Pressable>
	);
}

/** Groups options in a sheet under a label. */
export function SheetSection({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-2.5">
			<Text className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				{label}
			</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	content: { flex: 1, justifyContent: "flex-end" },
});
