export type EnumOption<Value extends string> = {
	label: string;
	value: Value;
};

export function enumOptions<Value extends string>(
	values: Record<Value, string>,
): EnumOption<Value>[] {
	return (Object.keys(values) as Value[]).map((value) => ({
		label: values[value],
		value,
	}));
}
