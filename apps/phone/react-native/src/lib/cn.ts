import { twMerge } from "tailwind-merge";
import type { ClassNameValue } from "tailwind-merge";

export function cn(...inputs: ClassNameValue[]) {
	return twMerge(inputs);
}
