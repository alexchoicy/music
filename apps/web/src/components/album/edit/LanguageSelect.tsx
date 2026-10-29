import { useQuery } from "@tanstack/react-query";

import { Field, FieldLabel } from "#/components/base/field";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "#/components/base/select";
import { languageQueries } from "#/lib/queries/language.queries";
import { makeLanguageOptions } from "#/lib/utils/language";

export function LanguageSelect({
	disabled,
	onValueChange,
	value,
}: {
	disabled?: boolean;
	onValueChange: (languageId: number | null) => void;
	value: number | null;
}) {
	const { data: languages = [] } = useQuery(languageQueries.getLanguages());
	const options = makeLanguageOptions(languages);
	const selected =
		options.find(
			(option) => option.id !== null && Number(option.id) === value,
		) ?? options[0];

	return (
		<Field className="w-full min-w-0">
			<FieldLabel nativeLabel={false} render={<div />}>
				Language
			</FieldLabel>
			<Select
				disabled={disabled}
				items={options}
				itemToStringLabel={(option) => option.label}
				itemToStringValue={(option) => option.value}
				onValueChange={(option) =>
					onValueChange(option?.id == null ? null : Number(option.id))
				}
				value={selected}
			>
				<SelectTrigger>
					<SelectValue />
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
