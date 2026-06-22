import { Field, FieldDescription, FieldLabel } from "#/components/coss/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/coss/select";

type OptionSelectFieldOption<Id> = {
	id: Id;
	label: string;
	value: string;
};

type OptionSelectFieldSharedProps<Id> = {
	className?: string;
	description?: React.ReactNode;
	id: string;
	label: string;
	name: string;
	options: OptionSelectFieldOption<Id>[];
	placeholder: string;
};

type OptionSelectFieldProps<Id> =
	| (OptionSelectFieldSharedProps<Id> & {
			onValueChange: (id: Id | undefined) => void;
			multiple?: false;
			value: OptionSelectFieldOption<Id>;
	  })
	| (OptionSelectFieldSharedProps<Id> & {
			onValueChange: (ids: Id[]) => void;
			multiple: true;
			value: OptionSelectFieldOption<Id>[];
	  });

export function OptionSelectField<Id>({
	className,
	description,
	id,
	label,
	multiple,
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
				multiple={multiple}
				name={name}
				onValueChange={(option) => {
					if (Array.isArray(option)) {
						if (multiple) onValueChange(option.map((item) => item.id));
						return;
					}

					if (!multiple) onValueChange(option?.id);
				}}
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
