import { CalendarIcon, XIcon } from "lucide-react";
import type * as React from "react";
import type { DropdownProps } from "react-day-picker";

import { Button } from "#/components/coss/button";
import { Calendar } from "#/components/coss/calendar";
import { Field, FieldLabel } from "#/components/coss/field";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "#/components/coss/popover";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import { cn } from "#/lib/utils/styles";

type ReleaseDateFieldProps = {
	className?: string;
	label?: string;
	name?: string;
	onChange: (value: string | null) => void;
	placeholder?: string;
	value: string | null;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

const START_YEAR = 1990;

function dateFromValue(value: string | null): Date | undefined {
	if (!value) return undefined;

	const date = new Date(value);
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function valueFromDate(date: Date): string {
	return new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	).toISOString();
}

function CalendarDropdown({
	className,
	disabled,
	options,
	style,
	value,
	onChange,
	"aria-label": ariaLabel,
}: DropdownProps): React.ReactElement {
	const items = options ?? [];
	const selectedItem =
		items.find((item) => item.value === Number(value)) ?? null;

	return (
		<Select
			disabled={disabled}
			items={items}
			onValueChange={(item) => {
				if (!item) return;

				onChange?.({
					target: { value: String(item.value) },
				} as React.ChangeEvent<HTMLSelectElement>);
			}}
			value={selectedItem}
		>
			<SelectTrigger
				aria-label={ariaLabel}
				className={cn("min-w-0 font-medium", className)}
				style={style}
			>
				<SelectValue />
			</SelectTrigger>
			<SelectPopup>
				{items.map((item) => (
					<SelectItem disabled={item.disabled} key={item.value} value={item}>
						{item.label}
					</SelectItem>
				))}
			</SelectPopup>
		</Select>
	);
}

export function ReleaseDateField({
	className,
	label = "Release date",
	name,
	onChange,
	placeholder = "Select release date",
	value,
}: ReleaseDateFieldProps): React.ReactElement {
	const selectedDate = dateFromValue(value);

	return (
		<Field className={className} name={name}>
			<FieldLabel nativeLabel={false} render={<div />}>
				{label}
			</FieldLabel>
			<div className="flex w-full gap-2">
				<Popover>
					<PopoverTrigger
						render={
							<Button
								className={cn(
									"min-w-0 flex-1 justify-start text-start font-normal",
									!selectedDate && "text-muted-foreground",
								)}
								variant="outline"
							/>
						}
					>
						<CalendarIcon aria-hidden="true" />
						<span className="truncate">
							{selectedDate ? dateFormatter.format(selectedDate) : placeholder}
						</span>
					</PopoverTrigger>
					<PopoverPopup align="start">
						<Calendar
							captionLayout="dropdown"
							components={{ Dropdown: CalendarDropdown }}
							endMonth={new Date(new Date().getFullYear(), 11)}
							mode="single"
							onSelect={(date) => {
								onChange(date ? valueFromDate(date) : null);
							}}
							selected={selectedDate}
							startMonth={new Date(START_YEAR, 0)}
						/>
					</PopoverPopup>
				</Popover>
				{selectedDate && (
					<Button
						aria-label="Clear release date"
						onClick={() => onChange(null)}
						size="icon"
						variant="outline"
					>
						<XIcon aria-hidden="true" />
					</Button>
				)}
			</div>
		</Field>
	);
}
