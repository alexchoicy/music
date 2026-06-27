import { z } from "zod";

export const PASSWORD_RULES = {
	requiredLength: 6,
	requireDigit: true,
	requireLowercase: true,
	requireNonAlphanumeric: true,
	requireUppercase: true,
} as const;

export type PasswordRuleKey = keyof typeof PASSWORD_RULES;

export const PASSWORD_RULE_LABEL: Record<PasswordRuleKey, string> = {
	requiredLength: `At least ${PASSWORD_RULES.requiredLength} characters`,
	requireDigit: "At least one digit",
	requireLowercase: "At least one lowercase letter",
	requireNonAlphanumeric: "At least one symbol",
	requireUppercase: "At least one uppercase letter",
};

export const passwordSchema = z
	.string()
	.min(PASSWORD_RULES.requiredLength)
	.regex(/\d/)
	.regex(/[a-z]/)
	.regex(/[^A-Za-z0-9]/)
	.regex(/[A-Z]/);

export function checkPassword(
	password: string,
): Record<PasswordRuleKey, boolean> {
	return {
		requiredLength: password.length >= PASSWORD_RULES.requiredLength,
		requireDigit: /\d/.test(password),
		requireLowercase: /[a-z]/.test(password),
		requireNonAlphanumeric: /[^A-Za-z0-9]/.test(password),
		requireUppercase: /[A-Z]/.test(password),
	};
}

export function isPasswordValid(password: string): boolean {
	return passwordSchema.safeParse(password).success;
}
