import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import fs from 'fs';
import mime from 'mime';
import { getMusicStorePath } from '@music/api/lib/musicUtil';

@Injectable()
export class MediaService {
	private readonly libraryDir: string;

	constructor(private readonly config: ConfigService) {
		if (config.get('appConfig.storage.type') !== 'local') {
			throw new BadRequestException(
				'LocalService can only be used with local storage',
			);
		}
		this.libraryDir = path.resolve(
			this.config.get('appConfig.storage.library_dir')!,
		);
	}

	pathCheck(filePath: string) {
		if (!filePath.startsWith(this.libraryDir + path.sep)) {
			throw new BadRequestException(
				'Invalid path/path traversal detected',
			);
		}
	}

	getMusicFileInfo(trackHash: string, type: 'original' | 'transcoded') {
		const filePath = path.join(
			this.libraryDir,
			type,
			getMusicStorePath(trackHash),
			trackHash,
		);

		this.pathCheck(filePath);

		const stat = fs.statSync(filePath);

		const contentType = mime.getType(filePath);

		return { filePath, stat, contentType };
	}

	getAlbumCoverFileInfo(filename: string) {
		const filePath = path.join(
			this.libraryDir,
			'attachments',
			'coverImages',
			filename,
		);

		this.pathCheck(filePath);

		return {
			filePath,
			contentType: mime.getType(filePath),
		};
	}
}
