import type { QueueEntry } from "@/player/track";

// Queue order rules, ported from the web player (apps/web/src/store/audioPlayer).

export type RepeatMode = "off" | "all" | "one";

export type QueueState = {
	queue: QueueEntry[];
	index: number;
	repeatMode: RepeatMode;
	shuffle: boolean;
	/** Indices played in shuffle order; `shuffleHistoryIndex` is the current one. */
	shuffleHistory: number[];
	shuffleHistoryIndex: number;
	/** Shuffled indices not played yet. */
	shuffleRemaining: number[];
};

export type ShuffleState = Pick<
	QueueState,
	"shuffleHistory" | "shuffleHistoryIndex" | "shuffleRemaining"
>;

export function shuffleIndices(indices: number[]) {
	const result = [...indices];
	for (let index = result.length - 1; index > 0; index--) {
		const other = Math.floor(Math.random() * (index + 1));
		[result[index], result[other]] = [result[other], result[index]];
	}
	return result;
}

export function createShuffleState(
	queueLength: number,
	index: number,
	shuffle: boolean,
): ShuffleState {
	if (!shuffle || queueLength === 0) {
		return {
			shuffleHistory: [],
			shuffleHistoryIndex: -1,
			shuffleRemaining: [],
		};
	}
	return {
		shuffleHistory: [index],
		shuffleHistoryIndex: 0,
		shuffleRemaining: shuffleIndices(
			Array.from({ length: queueLength }, (_, i) => i).filter(
				(i) => i !== index,
			),
		),
	};
}

/** Records a track picked directly, e.g. from the queue, in the shuffle order. */
export function recordShuffleTrack(
	state: QueueState,
	index: number,
): ShuffleState {
	const { shuffleHistory, shuffleHistoryIndex, shuffleRemaining } = state;
	if (!state.shuffle) {
		return { shuffleHistory, shuffleHistoryIndex, shuffleRemaining };
	}
	const history =
		shuffleHistory[shuffleHistoryIndex] === index
			? shuffleHistory
			: [...shuffleHistory.slice(0, shuffleHistoryIndex + 1), index];
	return {
		shuffleHistory: history,
		shuffleHistoryIndex: history.length - 1,
		shuffleRemaining: shuffleRemaining.filter((i) => i !== index),
	};
}

/** Updates shuffle indices after the queue changes; `null` drops an index. */
export function remapShuffleState(
	state: QueueState,
	mapIndex: (index: number) => number | null,
): ShuffleState {
	const history = state.shuffleHistory.map(mapIndex);
	return {
		shuffleHistoryIndex:
			history
				.slice(0, state.shuffleHistoryIndex + 1)
				.filter((index) => index !== null).length - 1,
		shuffleHistory: history.filter((index) => index !== null),
		shuffleRemaining: state.shuffleRemaining
			.map(mapIndex)
			.filter((index) => index !== null),
	};
}

export type NextPlayback = { index: number } & Partial<ShuffleState>;

/**
 * The next track to play, skipping tracks that cannot play now.
 * `automatic` is true when the previous track ended; only then does repeat-one replay it.
 */
export function getNextPlayback(
	state: QueueState,
	automatic: boolean,
	isPlayable: (entry: QueueEntry) => boolean,
): NextPlayback | null {
	const { index, queue } = state;
	const repeatMode =
		!automatic && state.repeatMode === "one" ? "off" : state.repeatMode;
	const isEligible = (i: number) => isPlayable(queue[i]);
	if (queue.length === 0) return null;

	if (repeatMode === "one") return isEligible(index) ? { index } : null;

	if (!state.shuffle) {
		for (let offset = 1; offset <= queue.length; offset++) {
			let next = index + offset;
			if (next >= queue.length) {
				if (repeatMode !== "all") return null;
				next -= queue.length;
			}
			if (isEligible(next)) return { index: next };
		}
		return null;
	}

	for (
		let cursor = state.shuffleHistoryIndex + 1;
		cursor < state.shuffleHistory.length;
		cursor++
	) {
		const next = state.shuffleHistory[cursor];
		if (isEligible(next)) return { index: next, shuffleHistoryIndex: cursor };
	}

	let remaining = state.shuffleRemaining;
	let candidate = remaining.findIndex(isEligible);
	if (candidate === -1 && repeatMode === "all") {
		remaining = shuffleIndices(queue.map((_, i) => i).filter(isEligible));
		if (remaining.length > 1 && remaining[0] === index) {
			[remaining[0], remaining[1]] = [remaining[1], remaining[0]];
		}
		candidate = remaining.length > 0 ? 0 : -1;
	}
	if (candidate === -1) return null;

	const next = remaining[candidate];
	const history = [
		...state.shuffleHistory.slice(0, state.shuffleHistoryIndex + 1),
		next,
	];
	return {
		index: next,
		shuffleHistory: history,
		shuffleHistoryIndex: history.length - 1,
		// Entries skipped because they cannot play now stay for later.
		shuffleRemaining: remaining.filter((_, i) => i !== candidate),
	};
}

/** The previous track, or null at the start of the queue. */
export function getPrevPlayback(
	state: QueueState,
	isPlayable: (entry: QueueEntry) => boolean,
): NextPlayback | null {
	const { index, queue } = state;
	if (state.shuffle) {
		for (let cursor = state.shuffleHistoryIndex - 1; cursor >= 0; cursor--) {
			const prev = state.shuffleHistory[cursor];
			if (isPlayable(queue[prev]))
				return { index: prev, shuffleHistoryIndex: cursor };
		}
		return null;
	}

	for (let offset = 1; offset < queue.length; offset++) {
		let prev = index - offset;
		if (prev < 0) {
			if (state.repeatMode !== "all") return null;
			prev += queue.length;
		}
		if (isPlayable(queue[prev])) return { index: prev };
	}
	return null;
}

/** Queue indices in the order they play after the current track. */
export function getUpcomingIndices(state: QueueState) {
	if (!state.shuffle) {
		return state.queue.map((_, i) => i).slice(state.index + 1);
	}
	return [
		...state.shuffleHistory.slice(state.shuffleHistoryIndex + 1),
		...state.shuffleRemaining,
	];
}

/** Moves one entry, keeping the current index and shuffle order on the same tracks. */
export function moveQueueEntry(
	state: QueueState,
	fromIndex: number,
	toIndex: number,
) {
	const mapIndex = (i: number) => {
		if (i === fromIndex) return toIndex;
		if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
		if (toIndex < fromIndex && i >= toIndex && i < fromIndex) return i + 1;
		return i;
	};
	const queue = [...state.queue];
	const [entry] = queue.splice(fromIndex, 1);
	queue.splice(toIndex, 0, entry);
	return {
		queue,
		index: mapIndex(state.index),
		...remapShuffleState(state, mapIndex),
	};
}
