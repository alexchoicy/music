import { useId } from "react";
import type { ReactNode } from "react";

import { Toggle } from "#/components/base/toggle";
import { cn } from "#/lib/utils/styles";

type FilterChipOption<Value extends string> = {
	count?: number;
	icon?: ReactNode;
	label: string;
	value: Value;
};

type FilterChipsProps<Value extends string> = {
	allCount?: number;
	allLabel?: string;
	hideLabel?: boolean;
	label: string;
	options: FilterChipOption<Value>[];
	// An empty selection means "all".
	onValueChange: (value: Value[]) => void;
	value: Value[];
	multiple?: boolean;
};

export function FilterChips<Value extends string>({
	allCount,
	allLabel = "All",
	hideLabel = false,
	label,
	multiple = false,
	onValueChange,
	options,
	value,
}: FilterChipsProps<Value>) {
	const labelId = useId();

	function toggle(option: Value, pressed: boolean) {
		if (!multiple) {
			onValueChange(pressed ? [option] : []);
			return;
		}
		onValueChange(
			pressed
				? [...value, option]
				: value.filter((selected) => selected !== option),
		);
	}

	return (
		<div
			aria-labelledby={labelId}
			className="flex flex-wrap items-center gap-1.5"
			role="group"
		>
			<span
				className={cn(
					"me-1 text-xs font-medium text-muted-foreground",
					hideLabel && "sr-only",
				)}
				id={labelId}
			>
				{label}
			</span>
			<Toggle
				onPressedChange={(pressed) => {
					if (pressed) onValueChange([]);
				}}
				pressed={value.length === 0}
				size="chip"
				variant="chip"
			>
				{allLabel}
				<ChipCount count={allCount} />
			</Toggle>
			{options.map((option) => (
				<Toggle
					key={option.value}
					onPressedChange={(pressed) => toggle(option.value, pressed)}
					pressed={value.includes(option.value)}
					size="chip"
					variant="chip"
				>
					{option.icon}
					{option.label}
					<ChipCount count={option.count} />
				</Toggle>
			))}
		</div>
	);
}

function ChipCount({ count }: { count?: number }) {
	if (count === undefined) return null;
	return <span className="text-xs tabular-nums opacity-70">{count}</span>;
}
