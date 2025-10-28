import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import { EntityManager } from '@mikro-orm/postgresql';
import { TrackQuality } from '#database/entities/trackQuality.js';
import { getMusicExt } from '@music/api/lib/musicUtil';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';
import { Artists, ArtistsAlias } from '#database/entities/artists.js';
import {
	formatMusicBrainzAlias,
	getMusicBrainzRelationUrl,
	searchMusicBrainzByName,
} from '#utils/artists/musicBrainz.js';

import {
	getImageBufferFromUrl,
	getTwitterProfileBannerUrl,
	getTwitterProfileImgUrl,
} from '#utils/artists/twitter.js';
import { Attachments } from '#database/entities/attachments.js';

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

	async getMusicBrainzData() {
		const artistInfo = await this.em.findAll(Artists, {
			where: { musicBrainzID: { $eq: null } },
		});

		for (const artist of artistInfo) {
			const musicBrainzInfo = await searchMusicBrainzByName(artist.name);

			if (!musicBrainzInfo) {
				continue;
			}

			artist.musicBrainzID = musicBrainzInfo.id;
			artist.area = musicBrainzInfo.area?.name || null;
			const aliases = formatMusicBrainzAlias(
				artist.name,
				musicBrainzInfo.aliases || [],
			);
			if (aliases.length > 0) {
				await this.em
					.createQueryBuilder(ArtistsAlias)
					.insert(
						aliases.map((a) => ({
							artist: artist.id,
							alias: a.name,
							type: a.type,
						})),
					)
					.onConflict('("artist_id", "alias") DO NOTHING')
					.execute();
			}
			await this.em.flush();
			// To avoid rate limit
			await new Promise((resolve) => setTimeout(resolve, 500));

			const relationData = await getMusicBrainzRelationUrl(
				musicBrainzInfo.id,
			);

			if (!relationData) {
				continue;
			}

			artist.spotifyID = relationData.spotifyID || null;
			artist.twitterName = relationData.twitterName || null;
			await this.em.flush();
			// To avoid rate limit
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	async getArtistImageAndBannerWithTwitter() {
		const twitterToken = process.env.TWITTER_BEARER_TOKEN;
		if (!twitterToken) {
			throw new BadRequestException('TWITTER_BEARER_TOKEN is not set');
		}

		const artistInfo = await this.em.findAll(Artists, {
			where: {
				twitterName: { $ne: null },
				profileBanner: null,
				profilePic: null,
			},
		});
		for (const artist of artistInfo) {
			if (!artist.twitterName) continue;
			const profileImg = await getTwitterProfileImgUrl(
				artist.twitterName,
				twitterToken,
			);

			if (!profileImg) {
				continue;
			}
			const profileImageData = await getImageBufferFromUrl(profileImg);
			if (profileImageData) {
				const attachment = this.em.create(Attachments, {
					entityType: 'artistImage',
					fileType: profileImageData.contentType,
				});
				await this.storageService.staticContent.saveArtistImage(
					attachment.id.toString(),
					profileImageData.buffer,
					profileImageData.contentType,
				);
				await this.em.persistAndFlush(attachment);
				artist.profilePic = attachment;
				await this.em.flush();
			}

			const bannerImg = await getTwitterProfileBannerUrl(
				artist.twitterName,
				twitterToken,
			);

			if (!bannerImg) {
				continue;
			}
			const bannerImageData = await getImageBufferFromUrl(bannerImg);
			if (bannerImageData) {
				const attachment = this.em.create(Attachments, {
					entityType: 'artistBanner',
					fileType: bannerImageData.contentType,
				});
				await this.storageService.staticContent.saveArtistBanner(
					attachment.id.toString(),
					bannerImageData.buffer,
					bannerImageData.contentType,
				);
				await this.em.persistAndFlush(attachment);
				artist.profileBanner = attachment;
				await this.em.flush();
			}
		}
	}
}
