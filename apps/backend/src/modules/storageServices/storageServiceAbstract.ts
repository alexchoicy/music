import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './LocalStorageService.js';

import { S3StorageService } from './s3StorageService.js';
import { StorageOptions } from '#config/appConfig.js';

export interface AudioStorageInterface {
	createPresignedMusicUploadUrl(
		albumId: string,
		trackId: string,
	): string | Promise<string>;

	getMusicDataUrl(
		trackHash: string,
		quality: string,
		ext: string,
	): string | Promise<string>;
}

export interface StaticStorageInterface {
	getAlbumCoverDataUrl(
		attachmentID: string,
		ext: string,
	): string | Promise<string>;

	saveCoverImage(
		attachmentID: string,
		imageBuffer: Buffer,
		ext: string,
	): string;
}

export abstract class StorageService {
	abstract readonly audio: AudioStorageInterface;
	abstract readonly staticContent: StaticStorageInterface;
}

export class CombinedStorageService extends StorageService {
	constructor(
		readonly audio: AudioStorageInterface,
		readonly staticContent: StaticStorageInterface,
	) {
		super();
	}
}

export function getServices(config: ConfigService) {
	let audioStorageService: AudioStorageInterface;
	let imageStorageService: StaticStorageInterface;

	switch (config.get('appConfig.storage.type.audio.provider')) {
		case StorageOptions.Local:
			audioStorageService = new LocalStorageService(config);
			break;
		case StorageOptions.S3:
			audioStorageService = new S3StorageService(config);
			break;
		default:
			throw new Error(
				`Unsupported audio storage type: ${config.get(
					'appConfig.storage.type.audio.provider',
				)}`,
			);
	}

	switch (config.get('appConfig.storage.type.static.provider')) {
		case StorageOptions.Local:
			imageStorageService = new LocalStorageService(config);
			break;
		case StorageOptions.S3:
			imageStorageService = new S3StorageService(config);
			break;
		default:
			throw new Error(
				`Unsupported audio storage type: ${config.get(
					'appConfig.storage.type.audio.provider',
				)}`,
			);
	}

	return new CombinedStorageService(audioStorageService, imageStorageService);
}
