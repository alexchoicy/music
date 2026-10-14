import { Field, FieldLabel } from "#/components/base/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/base/select";
import type { EnumOption } from "#/enums/utils";
import { cn } from "#/lib/utils/styles";

type FilterSelectSharedProps<Value extends string> = {
	className?: string;
	label: string;
	options: EnumOption<Value>[];
	placeholder?: string;
};

type FilterSelectProps<Value extends string> =
	| (FilterSelectSharedProps<Value> & {
			multiple?: false;
			onValueChange: (value: Value) => void;
			value: Value;
	  })
	| (FilterSelectSharedProps<Value> & {
			multiple: true;
			onValueChange: (value: Value[]) => void;
			value: Value[];
	  });

export function FilterSelect<Value extends string>({
	className,
	label,
	multiple,
	onValueChange,
	options,
	placeholder,
	value,
}: FilterSelectProps<Value>) {
	return (
		<Field className={cn("w-full min-w-0", className)}>
			<FieldLabel nativeLabel={false} render={<div />}>
				{label}
			</FieldLabel>
			<Select
				items={options}
				multiple={multiple}
				onValueChange={(nextValue) => {
					if (!nextValue) return;
					if (Array.isArray(nextValue)) {
						if (multiple)
							onValueChange(nextValue.map((option) => option.value));
						return;
					}
					if (!multiple) onValueChange(nextValue.value);
				}}
				value={
					multiple
						? options.filter((option) => value.includes(option.value))
						: (options.find((option) => option.value === value) ?? null)
				}
			>
				<SelectTrigger>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectPopup>
					{options.map((option) => (
						<SelectItem key={option.value} value={option}>
							{option.label}
						</SelectItem>
					))}
				</SelectPopup>
			</Select>
		</Field>
	);
}
