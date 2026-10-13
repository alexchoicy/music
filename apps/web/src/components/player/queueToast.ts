import { toastManager } from "#/components/base/toast";

export function showQueueToast(description: string, { next = false } = {}) {
	toastManager.add({
		type: "success",
		title: next ? "Playing next" : "Added to queue",
		description,
	});
}
