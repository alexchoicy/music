import { Field, FieldLabel } from "#/components/coss/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";
import type { EnumOption } from "#/enums/utils";

export type EnumFieldSelectProps<Value extends string> = {
	label: string;
	name?: string;
	onValueChange: (value: Value) => void;
	options: EnumOption<Value>[];
	placeholder?: string;
	size?: React.ComponentProps<typeof SelectTrigger>["size"];
	value: Value;
};

export function EnumFieldSelect<Value extends string>({
	label,
	name,
	onValueChange,
	options,
	placeholder,
	size,
	value,
}: EnumFieldSelectProps<Value>): React.ReactElement {
	return (
		<Field name={name}>
			<FieldLabel nativeLabel={false} render={<div />}>
				{label}
			</FieldLabel>
			<Select
				items={options}
				onValueChange={(nextValue) => {
					if (!nextValue) return;

					onValueChange(nextValue.value);
				}}
				value={options.find((option) => option.value === value) ?? null}
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
