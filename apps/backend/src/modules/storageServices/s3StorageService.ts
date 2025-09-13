import { Injectable } from '@nestjs/common';
import { StorageService } from './storageServiceAbstract.js';

@Injectable()
export class S3StorageService extends StorageService {
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
