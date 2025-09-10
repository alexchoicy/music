import { ConfigService } from '@nestjs/config';
import { StorageService } from './storageServiceAbstract.js';
import { Injectable } from '@nestjs/common';
import { TrackQualityType } from '@music/api/dto/album.dto';

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
}
