import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";

export default function PlaylistsScreen() {
	return (
		<Screen>
			<EmptyState
				description="Playlists you create will appear here."
				title="No playlists yet"
			/>
		</Screen>
	);
}
