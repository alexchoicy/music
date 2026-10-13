import { useHotkey } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";

type Direction = "down" | "left" | "right" | "up";

// Each action receives the index of the focused tile in the grid.
type GridTileActions = {
	onPlay?: (index: number) => void;
	onPlayNext?: (index: number) => void;
	onQueue?: (index: number) => void;
};

// W/A/S/D moves focus between the tiles of a library grid. The first key press
// focuses the first tile; each tile's link is the focus target. G plays the
// focused tile, Ctrl+G plays it next, and Ctrl+Q adds it to the queue.
export function useGridFocusHotkeys(
	gridRef: RefObject<HTMLElement | null>,
	actions: GridTileActions = {},
) {
	function gridItems() {
		return Array.from(gridRef.current?.children ?? []).filter(
			(item): item is HTMLElement => item instanceof HTMLElement,
		);
	}

	function runOnFocusedTile(action?: (index: number) => void) {
		const index = gridItems().findIndex((item) =>
			item.contains(document.activeElement),
		);
		if (index !== -1) action?.(index);
	}

	function focusTile(direction: Direction) {
		const items = gridItems();
		if (!items.length) return;

		const firstRowTop = items[0]?.offsetTop;
		const nextRowIndex = items.findIndex(
			(item) => item.offsetTop !== firstRowTop,
		);
		const columnCount = nextRowIndex === -1 ? items.length : nextRowIndex;
		const currentIndex = items.findIndex((item) =>
			item.contains(document.activeElement),
		);
		const nextIndex =
			currentIndex === -1
				? 0
				: {
						down: currentIndex + columnCount,
						left: currentIndex - 1,
						right: currentIndex + 1,
						up: currentIndex - columnCount,
					}[direction];

		const item = items.at(Math.max(0, Math.min(items.length - 1, nextIndex)));
		const link = item?.querySelector<HTMLAnchorElement>("a[href]");
		if (!item || !link) return;

		link.focus({ preventScroll: true });
		if (!isFullyVisible(item)) {
			item.scrollIntoView({
				block: "center",
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "auto"
					: "smooth",
			});
		}
	}

	useHotkey("W", () => focusTile("up"));
	useHotkey("A", () => focusTile("left"));
	useHotkey("S", () => focusTile("down"));
	useHotkey("D", () => focusTile("right"));
	useHotkey("G", () => runOnFocusedTile(actions.onPlay));
	useHotkey("Control+G", () => runOnFocusedTile(actions.onPlayNext));
	useHotkey("Control+Q", () => runOnFocusedTile(actions.onQueue));
}

// Room for the tile's focus outline around the visible edges.
const FOCUS_CLEARANCE = 8;

// The tile counts as visible only when it and its focus outline clear the
// scroll viewport edges and the floating player bar.
function isFullyVisible(item: HTMLElement) {
	const rect = item.getBoundingClientRect();
	const viewport = item
		.closest('[data-slot="scroll-area-viewport"]')
		?.getBoundingClientRect() ?? { bottom: window.innerHeight, top: 0 };
	const player = document
		.querySelector('[data-slot="player-bar"]')
		?.getBoundingClientRect();
	const bottom =
		player && player.height > 0
			? Math.min(viewport.bottom, player.top)
			: viewport.bottom;

	return (
		rect.top - FOCUS_CLEARANCE >= viewport.top &&
		rect.bottom + FOCUS_CLEARANCE <= bottom
	);
}
