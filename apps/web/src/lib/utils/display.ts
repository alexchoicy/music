export function getMMSSFromMs(ms: number) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const paddedSeconds = seconds.toString().padStart(2, "0");
	return `${minutes}:${paddedSeconds}`;
}

export function getHHMMFromMs(ms: number) {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	if (hours > 0) {
		return `${hours} hr ${minutes} min`;
	} else {
		return `${minutes} min`;
	}
}
