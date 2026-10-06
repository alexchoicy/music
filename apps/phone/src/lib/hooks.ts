import { useEffect, useState } from "react";
import { Keyboard, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The value once it has stopped changing for `delayMs`, e.g. typed search text. */
export function useDebounced<T>(value: T, delayMs = 300) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timeout = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timeout);
	}, [value, delayMs]);
	return debounced;
}

export const gridPadding = 16;
export const gridGap = 14;

/** Columns that fit items at least `minItemWidth` wide, and the resulting item width. */
export function useGrid(minItemWidth: number, minColumns = 2) {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const available = width - insets.left - insets.right - gridPadding * 2;
	const columns = Math.max(
		minColumns,
		Math.floor((available + gridGap) / (minItemWidth + gridGap)),
	);
	return {
		columns,
		itemWidth: (available - gridGap * (columns - 1)) / columns,
	};
}

export function useKeyboardVisible() {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const show = Keyboard.addListener("keyboardDidShow", () =>
			setVisible(true),
		);
		const hide = Keyboard.addListener("keyboardDidHide", () =>
			setVisible(false),
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);
	return visible;
}
