import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Req,
	Res,
	StreamableFile,
} from '@nestjs/common';
import { MediaService } from './media.service.js';
import type { Request, Response } from 'express';
import fs, { createReadStream } from 'fs';
import { pipeline } from 'stream';

@Controller('media')
export class MediaController {
	constructor(private readonly mediaService: MediaService) {}

	@Get('music/:type/:trackHash/')
	getMusicFile(
		@Param('type') type: string,
		@Param('trackHash') trackHash: string,
	) {
		if (type !== 'original' && type !== 'transcoded') {
			throw new BadRequestException('Invalid type');
		}

		const { filePath, contentType } = this.mediaService.getMusicFileInfo(
			trackHash,
			type,
		);

		const file = createReadStream(filePath);

		return new StreamableFile(file, {
			type: contentType || 'application/octet-stream',
		});
	}

	@Get('music/:type/:trackHash/stream')
	streamMusic(
		@Param('type') type: string,
		@Param('trackHash') trackHash: string,
		@Req() req: Request,
		@Res() res: Response,
	) {
		if (type !== 'original' && type !== 'transcoded') {
			res.status(400).send('Invalid type');
			return;
		}
		const { filePath, stat, contentType } =
			this.mediaService.getMusicFileInfo(trackHash, type);

		let range = req.headers.range;

		if (!range) {
			range = `bytes=0-${stat.size - 1}`;
		}

		const [rawStart, rawEnd] = range.replace(/bytes=/, '').split('-');
		const start = parseInt(rawStart, 10);
		const end = rawEnd ? parseInt(rawEnd, 10) : stat.size - 1;

		if (start >= stat.size || end >= stat.size) {
			res.status(416)
				.set({
					'Content-Range': `bytes */${stat.size}`,
				})
				.end();
			return;
		}

		res.writeHead(206, {
			'Content-Range': `bytes ${start}-${end}/${stat.size}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': end - start + 1,
			'Content-Type': contentType || 'application/octet-stream',
			'Cache-Control': 'public, max-age=31536000, immutable',
		});

		const stream = fs.createReadStream(filePath, { start, end });
		pipeline(stream, res, (err) => {
			if (err) {
				if (!res.headersSent) {
					res.sendStatus(500);
				} else {
					res.end();
				}
			}
		});
	}

	@Get('cover/:fileName')
	getCover(@Param('fileName') fileName: string, @Res() res: Response) {
		const { filePath, contentType } =
			this.mediaService.getAlbumCoverFileInfo(fileName);

		if (!fs.existsSync(filePath)) {
			res.status(404).send('Not found');
			return;
		}

		res.sendFile(filePath, {
			headers: {
				'Content-Type': contentType || 'application/octet-stream',
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		});
	}
}
