import { EmptyState } from "@/components/ui/emptyState";
import { Screen } from "@/components/ui/screen";

export default function PartiesScreen() {
	return (
		<Screen>
			<EmptyState
				description="Artists, groups, and projects will appear here."
				title="No parties yet"
			/>
		</Screen>
	);
}
