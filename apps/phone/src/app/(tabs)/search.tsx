import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";

export default function SearchScreen() {
	return (
		<Screen>
			<EmptyState
				description="Find albums, tracks, and parties."
				title="Search your library"
			/>
		</Screen>
	);
}
