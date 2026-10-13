import type { MouseEvent } from "react";

export function suppressNativeContextMenu(event: MouseEvent) {
	const target = event.target;
	if (
		target instanceof HTMLElement &&
		target.closest("input, textarea, [contenteditable=true]")
	) {
		return;
	}
	event.preventDefault();
}
