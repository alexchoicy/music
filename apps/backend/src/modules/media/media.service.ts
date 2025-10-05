import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import { getMusicStorePath } from '@music/api/lib/musicUtil';

@Injectable()
export class MediaService {
	constructor(private readonly config: ConfigService) {
		if (config.get('appConfig.storage.type') !== 'local') {
			throw new BadRequestException(
				'LocalService can only be used with local storage',
			);
		}
	}

	getMusicFileInfo(trackHash: string, type: 'original' | 'transcoded') {
		const filePath = path.join(
			this.config.get('appConfig.storage.library_dir')!,
			type,
			getMusicStorePath(trackHash),
			trackHash,
		);

		const stat = fs.statSync(filePath);
		const contentType = mime.getType(filePath);

		return { filePath, stat, contentType };
	}

	getAlbumCoverFileInfo(filename: string) {
		const filePath = path.join(
			this.config.get('appConfig.storage.library_dir')!,
			'attachments',
			'coverImages',
			filename,
		);

		return {
			filePath,
			contentType: mime.getType(filePath),
		};
	}
}
