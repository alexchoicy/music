import { Injectable } from '@nestjs/common';
import {
	AudioStorageInterface,
	StaticStorageInterface,
} from './storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3StorageService
	implements AudioStorageInterface, StaticStorageInterface
{
	constructor(private readonly config: ConfigService) {}

	saveCoverImage(
		attachmentID: string,
		imageBuffer: Buffer,
		ext: string,
	): string {
		throw new Error('Method not implemented.');
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
	getAlbumCoverDataUrl(
		attachmentID: string,
		ext: string,
	): string | Promise<string> {
		throw new Error('Method not implemented.');
	}
}
