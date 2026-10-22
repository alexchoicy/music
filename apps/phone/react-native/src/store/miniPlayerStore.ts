import { create } from "zustand";

/** How far the floating mini player overlaps the bottom of the page; 0 when hidden. */
export const useMiniPlayerStore = create<{ overlap: number }>()(() => ({
	overlap: 0,
}));

/** Bottom padding for a scrolling page, so its end clears the floating mini player. */
export function useEndPadding(base: number) {
	return base + useMiniPlayerStore((state) => state.overlap);
}
