import type { components } from "#/data/APIschema";

import { enumOptions } from "./utils";

type ExtraCategory = components["schemas"]["ExtraCategory"];

export const EXTRA_CATEGORY: Record<ExtraCategory, string> = {
	Booklet: "Booklet",
	Packaging: "Packaging",
	Insert: "Insert",
	Bonus: "Bonus",
	Other: "Other",
};

export const EXTRA_CATEGORY_OPTIONS = enumOptions(EXTRA_CATEGORY);
