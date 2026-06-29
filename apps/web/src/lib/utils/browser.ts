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
	if (navigator.share) {
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
