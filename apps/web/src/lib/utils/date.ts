export const dateFormatter = new Intl.DateTimeFormat("en-GB", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

export function dateFromValue(value: null | string | undefined) {
	if (!value) return undefined;

	return new Date(value);
}

export function valueFromDate(date: Date) {
	return date.toISOString();
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
	numeric: "auto",
});

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["day", 86_400_000],
	["hour", 3_600_000],
	["minute", 60_000],
];

export function formatRelativeTime(value: string): string {
	const elapsedMs = new Date(value).getTime() - Date.now();
	for (const [unit, unitMs] of RELATIVE_TIME_UNITS) {
		if (Math.abs(elapsedMs) >= unitMs) {
			return relativeTimeFormatter.format(Math.round(elapsedMs / unitMs), unit);
		}
	}
	return "just now";
}

export function formatDate(value: null | string | undefined) {
	const date = dateFromValue(value);
	return date ? dateFormatter.format(date) : null;
}
