import z4 from 'zod/v4';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { registerAs } from '@nestjs/config';

const storageConfig = z4
	.object({
		type: z4.enum(['local', 's3']).default('local'),
		library_dir: z4.string().optional(),
		s3: z4
			.object({
				endpoint: z4.string().optional(),
				region: z4.string().optional(),
			})
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.type === 'local') {
			if (!data.library_dir) {
				ctx.addIssue({
					code: 'custom',
					message:
						'library_dir is required when storage type is local',
				});
			}

			if (data.library_dir && !fs.existsSync(data.library_dir)) {
				ctx.addIssue({
					code: 'custom',
					message: `library_dir path "${data.library_dir}" does not exist`,
				});
			}
		}
		if (data.type === 's3') {
			if (!data.s3?.endpoint || !data.s3?.region) {
				ctx.addIssue({
					code: 'custom',
					message:
						's3.endpoint and s3.region are required when storage type is s3',
				});
			}
			const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
			if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
				ctx.addIssue({
					code: 'custom',
					message:
						'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required when storage type is s3',
				});
			}
		}
	});

const AppConfigSchema = z4
	.object({
		public_base_api_url: z4.url().optional(),
		public_data_url: z4.url().optional(),
	})
	.superRefine((data, ctx) => {
		if (!data.public_data_url) {
			ctx.addIssue({
				code: 'custom',
				message:
					'public_data_url is required. It is used to generate URLs for accessing media.',
			});
		}
	});

const ConfigSchema = z4.object({
	app: AppConfigSchema,
	storage: storageConfig,
});

export type AppConfig = z4.infer<typeof AppConfigSchema>;

function loadConfig() {
	const configPath = path.resolve(process.cwd(), 'config/appConfig.yaml');
	const configFile = fs.readFileSync(configPath, 'utf8');

	const raw = yaml.load(configFile);
	const parsed = ConfigSchema.safeParse(raw);

	if (!parsed.success) {
		console.log(parsed.error.issues);
		throw new Error(
			'Invalid config:\n' + JSON.stringify(parsed.error.issues),
		);
	}

	const config = parsed.data;

	if (config.storage.type === 'local' && config.storage.library_dir) {
		if (!config.app.public_base_api_url) {
			throw new Error(
				'public_base_api_url is required when storage type is local',
			);
		}

		const originalDir = path.join(config.storage.library_dir, 'original');
		const attachmentsDir = path.join(
			config.storage.library_dir,
			'attachments',
		);
		const coverImagesDir = path.join(attachmentsDir, 'coverImages');
		try {
			fs.mkdirSync(originalDir, { recursive: true });
			fs.mkdirSync(attachmentsDir, { recursive: true });
			fs.mkdirSync(coverImagesDir, { recursive: true });
		} catch (err) {
			throw new Error(
				`Failed to create storage folder: ${(err as Error).message}`,
			);
		}
	}

	return Object.freeze(config);
}

export default registerAs('app', () => loadConfig());

export const EnvSchema = z4.object({
	DATABASE_URL: z4.string().min(1, 'DATABASE_URL is required'),

	AWS_ACCESS_KEY_ID: z4.string().optional(),
	AWS_SECRET_ACCESS_KEY: z4.string().optional(),
	AWS_SESSION_TOKEN: z4.string().optional(),
});

export type EnvConfig = z4.infer<typeof EnvSchema>;
