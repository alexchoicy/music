import { useEffect, useState } from "react";
import type { RefObject } from "react";

import { cueIndexAt, liveCues } from "#/lib/utils/subtitles";
import type { Cue } from "#/lib/utils/subtitles";

const NO_CUES: readonly number[] = [];

const sameIndices = (a: readonly number[], b: readonly number[]) =>
	a.length === b.length && a.every((index, position) => index === b[position]);

function useMediaSelection<T, R>(
	mediaRef: RefObject<HTMLMediaElement | null>,
	items: readonly T[],
	select: (items: readonly T[], time: number) => R,
	initial: R,
	isEqual: (a: R, b: R) => boolean,
) {
	const [value, setValue] = useState(initial);
	const [selectedItems, setSelectedItems] = useState(items);
	if (selectedItems !== items) {
		setSelectedItems(items);
		setValue(initial);
	}

	useEffect(() => {
		const media = mediaRef.current;
		if (!media) return;

		let frame = 0;
		const update = () => {
			const next = select(items, media.currentTime);
			setValue((current) => (isEqual(current, next) ? current : next));
		};
		const loop = () => {
			update();
			frame = requestAnimationFrame(loop);
		};
		const start = () => {
			cancelAnimationFrame(frame);
			loop();
		};
		const stop = () => {
			cancelAnimationFrame(frame);
			update();
		};

		if (media.paused) update();
		else start();
		media.addEventListener("play", start);
		media.addEventListener("pause", stop);
		media.addEventListener("seeked", update);
		media.addEventListener("emptied", update);
		return () => {
			cancelAnimationFrame(frame);
			media.removeEventListener("play", start);
			media.removeEventListener("pause", stop);
			media.removeEventListener("seeked", update);
			media.removeEventListener("emptied", update);
		};
	}, [mediaRef, items, select, initial, isEqual]);

	return selectedItems === items ? value : initial;
}

export function useCueIndex(
	mediaRef: RefObject<HTMLMediaElement | null>,
	cues: readonly { start: number }[],
) {
	return useMediaSelection(mediaRef, cues, cueIndexAt, -1, Object.is);
}

export function useLiveCues(
	mediaRef: RefObject<HTMLMediaElement | null>,
	cues: readonly Cue[],
) {
	return useMediaSelection(mediaRef, cues, liveCues, NO_CUES, sameIndices);
}
