import type { SharedValue } from "react-native-reanimated";
import { Easing, makeMutable, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { StoreApi, UseBoundStore } from "zustand";
import { create } from "zustand";

type LayerState = {
	/** Whether the layer is open or opening. */
	open: boolean;
	/** Whether its content is mounted; it stays mounted while it animates or is dragged. */
	mounted: boolean;
};

/** A full-screen layer that slides up from the bottom, e.g. Now Playing. */
export type PlayerLayer = {
	/** 0 closed, 1 fully open. Drags move it on the UI thread. */
	progress: SharedValue<number>;
	useStore: UseBoundStore<StoreApi<LayerState>>;
	/** Mounts the layer before a drag moves it, without opening it. */
	mount: () => void;
	open: () => void;
	/** `onClosed` runs once the close animation ends, even if it is interrupted. */
	close: (onClosed?: () => void) => void;
	/** Closes it at once, e.g. when its screen goes away. */
	reset: () => void;
};

const openTiming = { duration: 300, easing: Easing.out(Easing.cubic) };
const closeTiming = { duration: 250, easing: Easing.in(Easing.cubic) };

function createLayer(): PlayerLayer {
	const progress = makeMutable(0);
	const useStore = create<LayerState>()(() => ({
		open: false,
		mounted: false,
	}));

	// Unmounting a closed layer stops its artwork and progress updates.
	const unmountClosed = () => {
		if (!useStore.getState().open) useStore.setState({ mounted: false });
	};

	return {
		progress,
		useStore,
		mount: () => useStore.setState({ mounted: true }),
		open: () => {
			useStore.setState({ open: true, mounted: true });
			progress.value = withTiming(1, openTiming);
		},
		close: (onClosed) => {
			useStore.setState({ open: false });
			progress.value = withTiming(0, closeTiming, (finished) => {
				if (finished) scheduleOnRN(unmountClosed);
				if (onClosed) scheduleOnRN(onClosed);
			});
		},
		reset: () => {
			useStore.setState({ open: false, mounted: false });
			progress.value = 0;
		},
	};
}

/** Now Playing, opened from the mini player. */
export const nowPlaying = createLayer();

/** The queue, opened above Now Playing. */
export const queueLayer = createLayer();

/** Closes Now Playing and the queue above it; `onClosed` runs once they are off screen. */
export function closePlayer(onClosed?: () => void) {
	queueLayer.close();
	nowPlaying.close(onClosed);
}
