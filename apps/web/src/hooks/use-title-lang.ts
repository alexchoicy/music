import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { languageQueries } from "#/lib/queries/language.queries";

// Languages are stored by name only. Mandarin can be written in Simplified or
// Traditional Chinese, so it gets the script-neutral "zh".
const LANG_BY_NAME: Record<string, string> = {
	cantonese: "zh-HK",
	english: "en",
	japanese: "ja",
	korean: "ko",
	mandarin: "zh",
};

type LanguageId = number | string | null | undefined;

export function useTitleLang() {
	const { data: languages } = useQuery(languageQueries.getLanguages());

	return useCallback(
		(...languageIds: LanguageId[]) => {
			const languageId = languageIds.find((id) => id != null);
			if (languageId == null) return undefined;
			const language = languages?.find(
				(item) => String(item.id) === String(languageId),
			);
			return language
				? LANG_BY_NAME[language.language.toLowerCase()]
				: undefined;
		},
		[languages],
	);
}
