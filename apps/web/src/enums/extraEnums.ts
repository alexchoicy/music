import type * as API from "@music/api";

import { enumOptions } from "./utils";

type ExtraCategory = API.ExtraCategory;

export const EXTRA_CATEGORY: Record<ExtraCategory, string> = {
	Booklet: "Booklet",
	Packaging: "Packaging",
	Insert: "Insert",
	Bonus: "Bonus",
	Other: "Other",
};

export const EXTRA_CATEGORY_OPTIONS = enumOptions(EXTRA_CATEGORY);
