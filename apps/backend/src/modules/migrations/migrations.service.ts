import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import { EntityManager } from '@mikro-orm/postgresql';
import { TrackQuality } from '#database/entities/trackQuality.js';
import { getMusicExt } from '@music/api/lib/musicUtil';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';

@Injectable()
export class MigrationsService {
	constructor(
		private readonly storageService: StorageService,
		private readonly config: ConfigService,
		private readonly em: EntityManager,
		private readonly jwksProvider: JWKSProvider,
	) {}

	async migrateAlbumCovers() {
		if (
			this.config.get('appConfig.storage.type.audio.provider') !== 's3' &&
			this.config.get('appConfig.storage.type.static.provider') !== 's3'
		) {
			throw new BadRequestException(
				'MigrationsService can only be used with s3 storage',
			);
		}
		const dir = path.join(
			this.config.get('appConfig.storage.library_dir')!,
			'attachments',
			'coverImages',
		);

		const files = fs.readdirSync(dir);

		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if (!stat.isFile()) continue;

			const parsed = path.parse(file);
			const attachmentID = parsed.name;
			const ext = (parsed.ext || '.jpg').slice(1);

			const fileBuffer = fs.readFileSync(filePath);

			await this.storageService.staticContent.saveCoverImage(
				attachmentID,
				fileBuffer,
				ext,
			);
		}

		return {
			migrated: files.length,
			message:
				'Migration completed, The 404 may cached in your CDN, remember to purge it.',
		};
	}

	async migrateMusicQualityData() {
		const tempToken = await this.jwksProvider.signAccessToken({
			type: 'machine',
			info: {
				uid: '0',
				role: 'admin',
			},
		});

		const data = await this.em.findAll(TrackQuality);

		for (const item of data) {
			// migrate size
			if (!item.sizeBytes) {
				const url = await this.storageService.audio.getMusicDataUrl(
					item.hash,
					item.type,
					getMusicExt(item.fileContainer, item.fileCodec) || '',
				);

				const data = await fetch(url, {
					headers: {
						Authorization: `Bearer ${tempToken}`,
					},
				});

				if (data.ok) {
					const size = data.headers.get('content-length');
					if (size) {
						item.sizeBytes = parseInt(size, 10);
						await this.em.flush();
					}
				}
			}
		}
	}
}
