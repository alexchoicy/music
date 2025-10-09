import { z } from 'zod/v4';
import fs from 'fs';
import path from 'path';
import { registerAs } from '@nestjs/config';
import yaml from 'js-yaml';

export enum StorageOptions {
	Local = 'local',
	S3 = 's3',
}

const storageProvider = z.object({
	provider: z.enum(StorageOptions).default(StorageOptions.Local),
	bucket: z.string().optional(),
});

export const storageConfig = z
	.object({
		type: z.object({
			audio: storageProvider,
			static: storageProvider,
		}),
		library_dir: z.string().optional(),
		s3: z
			.object({
				endpoint: z.string().optional(),
				region: z.string().optional(),
			})
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (
			data.type.audio.provider === StorageOptions.Local ||
			data.type.static.provider === StorageOptions.Local
		) {
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
		if (
			data.type.audio.provider === StorageOptions.S3 ||
			data.type.static.provider === StorageOptions.S3
		) {
			if (
				data.type.audio.provider === StorageOptions.S3 &&
				!data.type.audio.bucket
			) {
				ctx.addIssue({
					code: 'custom',
					message: 'bucket is needed',
				});
			}

			if (
				data.type.static.provider === StorageOptions.S3 &&
				!data.type.static.bucket
			) {
				ctx.addIssue({
					code: 'custom',
					message: 'bucket is needed',
				});
			}

			if (!data.s3?.endpoint || !data.s3?.region) {
				ctx.addIssue({
					code: 'custom',
					message:
						's3.endpoint and s3.region are required when storage type is s3',
				});
			}
			const { S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY } = process.env;
			if (!S3_ACCESS_KEY || !S3_SECRET_ACCESS_KEY) {
				ctx.addIssue({
					code: 'custom',
					message:
						'S3_SECRET_ACCESS_KEY and S3_ACCESS_KEY are required when storage type is s3',
				});
			}
		}
	});

const AppConfigSchema = z
	.object({
		public_base_api_url: z.url().optional(),
		public_data_url: z.url().optional(),
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

const SecurityConfigSchema = z.object({
	token: z.object({
		issuer: z.string().url().default('http://localhost:3100'),
		audience: z.string().default('music-app'),
	}),
	cookies: z.object({
		domain: z.string().default('localhost'),
	}),
	cors: z.object({
		origin: z
			.array(z.string())
			.default(['http://localhost:5000', 'http://localhost:3000']),
		credentials: z.boolean().default(true),
	}),
});

const ConfigSchema = z.object({
	app: AppConfigSchema,
	storage: storageConfig,
	security: SecurityConfigSchema,
});

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

	if (
		(config.storage.type.audio.provider === StorageOptions.Local ||
			config.storage.type.static.provider === StorageOptions.Local) &&
		config.storage.library_dir
	) {
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

export default registerAs('appConfig', () => loadConfig());
