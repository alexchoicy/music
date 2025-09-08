import { ConfigService } from '@nestjs/config';
import { StorageService } from './storageServiceAbstract.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LocalStorageService extends StorageService {
	constructor(private readonly config: ConfigService) {
		super();
	}

	createPresignedMusicUploadUrl(albumId: string, trackId: string) {
		return `${this.config.get('app.app.public_base_api_url')}/uploads/local/music/${albumId}/${trackId}`;
	}
}
