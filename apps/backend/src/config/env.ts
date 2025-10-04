import { z } from 'zod/v4';

export const EnvSchema = z.object({
	DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
	AWS_SESSION_TOKEN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;
