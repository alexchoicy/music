import type { ReactNode } from "react";
import { useEffect } from "react";
import { BackHandler, useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import type { PlayerLayer } from "@/player/nowPlaying";

/** How far or fast a drag must go to open or close a layer. */
const dragDistanceRatio = 0.2;
const dragVelocity = 800;

type PlayerLayerViewProps = {
	layer: PlayerLayer;
	children: ReactNode;
};

/** A full-screen layer that slides up over the tabs; back closes it. Mounted only while open, opening, or dragged. */
export function PlayerLayerView({ layer, children }: PlayerLayerViewProps) {
	const mounted = layer.useStore((state) => state.mounted);
	const open = layer.useStore((state) => state.open);
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	// Signing out removes the tabs; the layer starts closed next time.
	useEffect(() => layer.reset, [layer]);

	// Listeners added later run first, so the topmost open layer closes.
	useEffect(() => {
		if (!open) return;
		const subscription = BackHandler.addEventListener(
			"hardwareBackPress",
			() => {
				layer.close();
				return true;
			},
		);
		return () => subscription.remove();
	}, [layer, open]);

	const { progress } = layer;
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: (1 - progress.value) * height }],
	}));

	if (!mounted) return null;
	return (
		<Animated.View
			className="absolute inset-0 bg-background"
			style={[
				{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
					paddingLeft: insets.left,
					paddingRight: insets.right,
				},
				style,
			]}
		>
			{children}
		</Animated.View>
	);
}

/**
 * Dragging moves a layer with the finger: down to close it, or up to open it,
 * e.g. Now Playing from the mini player. Far or fast enough finishes the move;
 * a short or cancelled drag settles back.
 */
export function useLayerDragGesture(
	layer: PlayerLayer,
	direction: "open" | "close",
) {
	const { height } = useWindowDimensions();
	// Worklets copy what they capture, so they take the parts they use, not the store.
	const { progress, mount, open, close } = layer;
	const sign = direction === "open" ? -1 : 1;
	return Gesture.Pan()
		.activeOffsetY(sign * 12)
		.failOffsetX([-16, 16])
		.onStart(() => {
			if (sign < 0) scheduleOnRN(mount);
		})
		.onUpdate((event) => {
			const moved = (sign * event.translationY) / height;
			progress.value = Math.min(1, Math.max(0, sign < 0 ? moved : 1 - moved));
		})
		.onEnd((event, success) => {
			const finished =
				success &&
				(sign * event.translationY > height * dragDistanceRatio ||
					sign * event.velocityY > dragVelocity);
			const shouldOpen = sign < 0 ? finished : !finished;
			scheduleOnRN(shouldOpen ? open : close);
		});
}
