import { FileUploadStatus, Tracks } from '#database/entities/tracks.js';
import { getMusicExt, getStorePath } from '#utils/upload/utils.js';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import { md5 } from '@noble/hashes/legacy.js';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { Request } from 'express';
import fs from 'fs';
@Injectable()
export class LocalService {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly config: ConfigService,
	) {
		if (config.get('app.storage.type') !== 'local') {
			throw new BadRequestException(
				'LocalService can only be used with local storage',
			);
		}
	}

	async saveMusicFile(
		albumId: string,
		trackId: string,
		file: Request,
		uploadHash: string,
	) {
		const track = await this.em.findOne(Tracks, {
			id: BigInt(trackId),
			albumTracksCollection: { album: BigInt(albumId) },
			uploadHashCheck: uploadHash,
		});

		if (!track) {
			throw new BadRequestException('Track not found');
		}

		if (track.uploadStatus === FileUploadStatus.COMPLETED) {
			throw new BadRequestException('Track already uploaded');
		}

		const libraryDir = this.config.get<string>('app.storage.library_dir')!;

		const trackPath = getStorePath(track.hash);

		const ext = getMusicExt(track.fileContainer, track.fileCodec);
		if (!ext) {
			throw new BadRequestException('Unsupported file type');
		}

		const fullPath = path.join(
			libraryDir,
			'original',
			trackPath,
			track.hash + ext,
		);

		fs.mkdirSync(path.dirname(fullPath), { recursive: true });

		const writeStream = fs.createWriteStream(fullPath);

		const hasher = md5.create();

		const tap = new Transform({
			transform(chunk: Buffer, _enc, cb) {
				hasher.update(chunk);
				cb(null, chunk);
			},
		});

		await pipeline(file, tap, writeStream);

		const md5Unit8 = hasher.digest();
		const hex = Buffer.from(md5Unit8).toString('hex');

		if (
			hex.toLowerCase() !== track.uploadHashCheck.toLowerCase() &&
			hex.toLowerCase() !== uploadHash.toLowerCase()
		) {
			fs.rmSync(fullPath);
			throw new BadRequestException('Hash mismatch');
		}

		track.uploadStatus = FileUploadStatus.COMPLETED;

		await this.em.persistAndFlush(track);
	}
}
