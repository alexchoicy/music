import type { Href } from "expo-router";
import { router } from "expo-router";

// The tab group shown below Now Playing, e.g. `(settings)`; set by the tab bar.
let currentTab = "(albums)";

export function setCurrentTab(tab: string) {
	currentTab = tab;
}

/**
 * Opens an album or Party page in the current tab. From Now Playing or the
 * queue (`fromPlayer`), those close first so the page opens below them.
 */
export function openPage(
	page: "album" | "party",
	id: string,
	fromPlayer = false,
) {
	if (!fromPlayer) {
		router.push({ pathname: `/${page}/[id]`, params: { id } });
		return;
	}
	router.dismissAll();
	// Below the modal, the route alone would resolve to the first tab, so the tab is named.
	router.push(`/${currentTab}/${page}/${encodeURIComponent(id)}` as Href);
}
