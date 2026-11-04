import type { KeyboardEvent } from "react";

export function isProbablyPhone(): boolean {
	const hasTouch = navigator.maxTouchPoints > 0;

	const smallScreen = window.matchMedia("(max-width: 767px)").matches;

	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

	return hasTouch && smallScreen && coarsePointer;
}

type ShareUrlOptions = {
	title: string;
	text?: string;
	url: string;
};

export async function shareUrl({ title, text, url }: ShareUrlOptions) {
	if ("share" in navigator) {
		try {
			await navigator.share({ title, text, url });
			return "shared";
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return "cancelled";
			}
		}
	}

	await navigator.clipboard.writeText(url);
	return "copied";
}

export function handlePlayerSpace(
	event: KeyboardEvent<HTMLElement>,
	togglePlayback: () => void,
) {
	if (event.key !== " " || event.defaultPrevented) return;
	const target = event.target;
	if (
		!(target instanceof HTMLElement) ||
		!target.closest("button, [role='button']") ||
		target.closest("[role='menu'], [role='listbox'], [role='slider']")
	)
		return;
	event.preventDefault();
	target.blur();
	if (!event.repeat) togglePlayback();
}
