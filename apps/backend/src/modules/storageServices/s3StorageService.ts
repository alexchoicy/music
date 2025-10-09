import { Injectable } from '@nestjs/common';
import {
	AudioStorageInterface,
	StaticStorageInterface,
} from './storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import mime from 'mime';

@Injectable()
export class S3StorageService
	implements AudioStorageInterface, StaticStorageInterface
{
	private s3Client: S3Client;
	constructor(private readonly config: ConfigService) {
		const { S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY } = process.env;
		const region: string | undefined = this.config.get(
			'appConfig.storage.s3.region',
		);
		const endpoint: string | undefined = this.config.get(
			'appConfig.storage.s3.endpoint',
		);

		if (!region || !endpoint || !S3_SECRET_ACCESS_KEY || !S3_ACCESS_KEY) {
			throw new Error('S3 Config is needed');
		}

		this.s3Client = new S3Client({
			region,
			endpoint,
			credentials: {
				accessKeyId: S3_ACCESS_KEY,
				secretAccessKey: S3_SECRET_ACCESS_KEY,
			},
		});
	}

	async saveCoverImage(
		attachmentID: string,
		imageBuffer: Buffer,
		ext: string,
	): Promise<string> {
		const upload = new PutObjectCommand({
			Bucket: this.config.get('appConfig.storage.type.static.bucket'),
			Key: `coverImages/${attachmentID}.${ext}`,
			ContentType: mime.getType(ext) || 'image/jpeg',
			Body: imageBuffer,
			CacheControl: 'public, max-age=31536000, immutable',
		});

		await this.s3Client.send(upload);

		return `${attachmentID}.${ext}`;
	}

	getAlbumCoverDataUrl(attachmentID: string, ext: string) {
		return `${this.config.get('appConfig.app.public_data_url')}/coverImages/${attachmentID}.${ext}`;
	}

	createPresignedMusicUploadUrl(
		albumId: string,
		trackId: string,
	): string | Promise<string> {
		throw new Error('Method not implemented.');
	}
	getMusicDataUrl(
		trackHash: string,
		quality: string,
		ext: string,
	): string | Promise<string> {
		throw new Error('Method not implemented.');
	}
}
