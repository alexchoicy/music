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

export function formatDate(value: null | string | undefined) {
	const date = dateFromValue(value);
	return date ? dateFormatter.format(date) : null;
}
