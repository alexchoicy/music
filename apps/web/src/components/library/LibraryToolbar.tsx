import { SearchIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "#/components/base/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "#/components/base/input-group";

export function SearchField({
	label,
	onValueChange,
	value,
}: {
	label: string;
	onValueChange: (value: string) => void;
	value: string;
}) {
	return (
		<InputGroup className="w-full sm:w-64">
			<InputGroupAddon>
				<SearchIcon aria-hidden="true" />
			</InputGroupAddon>
			<InputGroupInput
				aria-label={label}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={label}
				type="search"
				value={value}
			/>
		</InputGroup>
	);
}

export function ResetFiltersButton({
	disabled,
	onClick,
}: {
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<Button disabled={disabled} onClick={onClick} size="sm" variant="ghost">
			Reset filters
		</Button>
	);
}

export function LibraryFooter({ children }: { children: ReactNode }) {
	return (
		<footer className="mt-2 flex flex-col items-center gap-4">
			{children}
		</footer>
	);
}
