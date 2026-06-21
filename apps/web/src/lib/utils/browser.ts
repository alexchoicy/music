export function isProbablyPhone(): boolean {
	const hasTouch = navigator.maxTouchPoints > 0;

	const smallScreen = window.matchMedia("(max-width: 767px)").matches;

	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

	return hasTouch && smallScreen && coarsePointer;
}
