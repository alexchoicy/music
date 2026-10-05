/** Formats a total length such as an album or playlist, e.g. `1h 5m`. */
export function formatTotalDuration(durationInMs: number | string) {
	const totalMinutes = Math.round(Number(durationInMs) / 60_000);
	if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0m";

	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes}m`;
	return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** Formats a track length as `m:ss`, or `h:mm:ss` past an hour. */
export function formatTrackDuration(durationInMs: number | string) {
	const totalSeconds = Math.round(Number(durationInMs) / 1000);
	if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
		: `${minutes}:${seconds}`;
}
