import { Field, FieldLabel } from "#/components/coss/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import type { EnumOption } from "#/enums/utils";

type EnumFieldSelectSharedProps<Value extends string> = {
	label: string;
	name?: string;
	options: EnumOption<Value>[];
	placeholder?: string;
	size?: React.ComponentProps<typeof SelectTrigger>["size"];
};

export type EnumFieldSelectProps<Value extends string> =
	| (EnumFieldSelectSharedProps<Value> & {
			onValueChange: (value: Value) => void;
			multiple?: false;
			value: Value;
	  })
	| (EnumFieldSelectSharedProps<Value> & {
			onValueChange: (value: Value[]) => void;
			multiple: true;
			value: Value[];
	  });

export function EnumFieldSelect<Value extends string>({
	label,
	name,
	onValueChange,
	options,
	placeholder,
	size,
	multiple,
	value,
}: EnumFieldSelectProps<Value>): React.ReactElement {
	return (
		<Field name={name}>
			<FieldLabel nativeLabel={false} render={<div />}>
				{label}
			</FieldLabel>
			<Select
				multiple={multiple}
				items={options}
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
						? options.filter(
								(option) =>
									Array.isArray(value) && value.includes(option.value),
							)
						: (options.find((option) => option.value === value) ?? null)
				}
			>
				<SelectTrigger size={size}>
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
