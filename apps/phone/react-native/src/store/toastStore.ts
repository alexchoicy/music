import { AccessibilityInfo } from "react-native";
import { create } from "zustand";

type ToastState = {
	toast: { id: number; message: string } | null;
};

export const useToastStore = create<ToastState>()(() => ({ toast: null }));

let nextId = 0;

/** Shows a short message above the tab bar; a newer message replaces it. */
export function showToast(message: string) {
	useToastStore.setState({ toast: { id: nextId++, message } });
	AccessibilityInfo.announceForAccessibility(message);
}
