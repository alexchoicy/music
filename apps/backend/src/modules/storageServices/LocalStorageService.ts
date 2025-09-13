import { ConfigService } from '@nestjs/config';
import { StorageService } from './storageServiceAbstract.js';
import { Injectable } from '@nestjs/common';
import { TrackQualityType } from '@music/api/dto/album.dto';
import fs from 'fs';
import path from 'path';

@Injectable()
export class LocalStorageService extends StorageService {
	constructor(private readonly config: ConfigService) {
		super();
	}

	createPresignedMusicUploadUrl(albumId: string, trackId: string) {
		return `${this.config.get('app.app.public_base_api_url')}/uploads/local/music/${albumId}/${trackId}`;
	}

	getMusicDataUrl(trackHash: string, quality: TrackQualityType, ext: string) {
		return `${this.config.get('app.app.public_data_url')}/media/music/${quality}/${trackHash}${ext}`;
	}

	getAlbumCoverDataUrl(attachmentID: string, ext: string) {
		return `${this.config.get('app.app.public_data_url')}/media/cover/${attachmentID}.${ext}`;
	}

	saveCoverImage(
		attachmentID: string,
		imageBuffer: Buffer,
		ext: string,
	): string {
		const dir = path.join(
			this.config.get('app.storage.library_dir')!,
			'attachments',
			'coverImages',
		);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(path.join(dir, `${attachmentID}.${ext}`), imageBuffer);
		return `${attachmentID}.${ext}`;
	}
}
