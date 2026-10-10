import type { Href } from "expo-router";
import { router } from "expo-router";

import { closePlayer } from "@/player/nowPlaying";

// The tab group shown below Now Playing, e.g. `(settings)`; set by the tab bar.
let currentTab = "(home)";

export function setCurrentTab(tab: string) {
	currentTab = tab;
}

/**
 * Opens an album or Party page in the current tab. From Now Playing or the
 * queue (`fromPlayer`), those close first so the page shows.
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
	closePlayer();
	// The tab is named so the page opens in the tab below Now Playing.
	router.push(`/${currentTab}/${page}/${encodeURIComponent(id)}` as Href);
}
