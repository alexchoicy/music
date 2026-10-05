import { Stack } from "expo-router";

// Links opening a detail use `withAnchor`, so the list is always beneath it and
// back returns to this tab's list instead of falling through to the first tab.
export const unstable_settings = { anchor: "index" };

export default function Layout() {
	return <Stack screenOptions={{ headerShown: false }} />;
}
