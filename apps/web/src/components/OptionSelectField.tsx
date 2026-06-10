import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";

export type OptionSelectFieldOption<Id> = {
	id: Id;
	label: string;
	value: string;
};

type OptionSelectFieldProps<Id> = {
	className?: string;
	description?: React.ReactNode;
	id: string;
	label: string;
	name: string;
	onValueChange: (id: Id | undefined) => void;
	options: OptionSelectFieldOption<Id>[];
	placeholder: string;
	value: OptionSelectFieldOption<Id>;
};

export function OptionSelectField<Id>({
	className,
	description,
	id,
	label,
	name,
	onValueChange,
	options,
	placeholder,
	value,
}: OptionSelectFieldProps<Id>) {
	return (
		<Field className={className} name={name}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select
				items={options}
				itemToStringLabel={(option) => option.label}
				itemToStringValue={(option) => option.value}
				name={name}
				onValueChange={(option) => onValueChange(option?.id)}
				value={value}
			>
				<SelectTrigger id={id}>
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
			{description ? <FieldDescription>{description}</FieldDescription> : null}
		</Field>
	);
}
