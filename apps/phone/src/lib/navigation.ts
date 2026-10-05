import { useNavigationContainerRef } from "expo-router";
import type {
	NavigationState,
	PartialState,
} from "expo-router/react-navigation";
import { StackActions } from "expo-router/react-navigation";

type State = NavigationState | PartialState<NavigationState>;

/** Finds the stack state of a tab, if the tab has been opened. */
function findTabStack(
	state: State | undefined,
	tab: string,
): State | undefined {
	for (const route of state?.routes ?? []) {
		if (route.name === tab && route.state?.type === "stack") return route.state;
		const nested = findTabStack(route.state, tab);
		if (nested) return nested;
	}
	return undefined;
}

/** A web click that the browser handles itself, e.g. opening a new tab. */
function isModifiedClick(event: object | undefined) {
	if (!event || !("button" in event)) return false;
	const click = event as Partial<MouseEvent>;
	return (
		!!(click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) ||
		(click.button ?? 0) !== 0
	);
}

/**
 * Pops a tab back to its list before opening an album or Party page there, so
 * back returns to the list instead of pages opened earlier in that tab.
 * Call it from a Link's `onPress`, which runs before the Link navigates.
 */
export function useClearTabHistory() {
	const navigationRef = useNavigationContainerRef();

	return (tab: "albums" | "parties", event?: object) => {
		if (isModifiedClick(event)) return;
		const stack = findTabStack(navigationRef.getRootState(), tab);
		if (stack?.key && (stack.index ?? 0) > 0) {
			navigationRef.dispatch({ ...StackActions.popToTop(), target: stack.key });
		}
	};
}
