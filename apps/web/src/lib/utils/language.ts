import type { LanguageItem } from "#/store/albumUploadStoreType";

export type LanguageOption = {
	id: LanguageItem["id"] | null;
	label: string;
	value: string;
};

const NO_LANGUAGE_OPTION_VALUE = "__none__";

export function makeLanguageOptions(
	languages: LanguageItem[],
): LanguageOption[] {
	return [
		{ id: null, label: "No language", value: NO_LANGUAGE_OPTION_VALUE },
		...languages.map((language) => ({
			id: language.id,
			label: language.language,
			value: String(language.id),
		})),
	];
}

export function makeReplaceLanguageOptions(
	languages: LanguageItem[],
): LanguageOption[] {
	return [
		{
			id: null,
			label: "Keep current language",
			value: NO_LANGUAGE_OPTION_VALUE,
		},
		...languages.map((language) => ({
			id: language.id,
			label: language.language,
			value: String(language.id),
		})),
	];
}
