import { AlertCircleIcon } from "lucide-react";

import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from "#/components/coss/alert";
import { Checkbox } from "#/components/coss/checkbox";
import { Label } from "#/components/coss/label";

type UnsolvedCreditsAlertProps = {
	isCleared: boolean;
	onClear: (checked: boolean) => void;
	title: string;
	unsolvedCredits: string[];
};

export function UnsolvedCreditsAlert({
	isCleared,
	onClear,
	title,
	unsolvedCredits,
}: UnsolvedCreditsAlertProps) {
	if (unsolvedCredits.length === 0) return null;

	return (
		<Alert variant="warning">
			<AlertCircleIcon />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription>
				<ul className="list-disc ps-4">
					{unsolvedCredits.map((credit) => (
						<li key={credit}>{credit}</li>
					))}
				</ul>
			</AlertDescription>
			<AlertAction className="items-center gap-2">
				<Checkbox
					checked={isCleared}
					onCheckedChange={onClear}
					id="unsolved-credits-clear"
				/>
				<Label htmlFor="unsolved-credits-clear">
					Clear these unsolved credits when saving
				</Label>
			</AlertAction>
		</Alert>
	);
}
