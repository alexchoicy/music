import { toastManager } from "#/components/base/toast";

export async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		toastManager.add({ type: "success", title: "Copied", description: text });
	} catch (error) {
		toastManager.add({
			type: "error",
			title: "Could not copy",
			description: error instanceof Error ? error.message : undefined,
		});
	}
}
