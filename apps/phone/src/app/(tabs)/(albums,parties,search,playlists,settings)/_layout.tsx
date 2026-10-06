import { Stack } from "expo-router";

// Each tab is a stack of these shared routes, so an album or Party page opens
// in the tab it was picked from. `segment` names the tab, e.g. `(parties)`.
const initialRoutes: Record<string, string> = {
	"(albums)": "index",
	"(parties)": "parties",
	"(search)": "search",
	"(playlists)": "playlists",
	"(settings)": "settings",
};

export default function TabStackLayout({ segment }: { segment: string }) {
	return (
		<Stack
			initialRouteName={initialRoutes[segment]}
			screenOptions={{ headerShown: false }}
		/>
	);
}
