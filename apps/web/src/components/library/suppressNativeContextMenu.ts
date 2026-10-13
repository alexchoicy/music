import type { MouseEvent } from "react";

// On pages whose tiles have their own context menu, right-clicking elsewhere
// shows nothing instead of the browser's menu. Text fields keep the browser
// menu for copy and paste.
export function suppressNativeContextMenu(event: MouseEvent) {
	const target = event.target;
	// Portaled dialogs bubble here through React but keep the browser menu.
	if (
		target instanceof Element &&
		!event.currentTarget.contains(target) &&
		target.closest('[role="dialog"], [role="alertdialog"]')
	) {
		return;
	}
	if (
		target instanceof HTMLElement &&
		target.closest("input, textarea, [contenteditable=true]")
	) {
		return;
	}
	event.preventDefault();
}
