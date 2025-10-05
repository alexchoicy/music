import {
	BadRequestException,
	Controller,
	Headers,
	HttpCode,
	HttpStatus,
	Param,
	Put,
	Req,
} from '@nestjs/common';
import { LocalService } from './local.service.js';
import type { Request } from 'express';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';

@Controller('')
export class LocalController {
	constructor(private readonly localService: LocalService) {}

	@Put('music/:albumId/:trackId')
	@ApiBody({
		required: true,
		schema: { type: 'string', format: 'binary' },
		description: 'Raw file bytes. Do NOT wrap in multipart/form-data.',
	})
	@ApiConsumes('audio/*')
	@HttpCode(HttpStatus.CREATED)
	@ApiResponse({ status: 201, description: 'File uploaded successfully' })
	async uploadMusicFile(
		@Req() request: Request,
		@Headers('content-md5') uploadHash: string,
		@Param('albumId') albumId: string,
		@Param('trackId') trackId: string,
	) {
		if (albumId === undefined || trackId === undefined) {
			throw new BadRequestException('Missing albumId or trackId');
		}

		if (!uploadHash) {
			throw new BadRequestException('Missing Content-MD5 header');
		}

		await this.localService.saveMusicFile(
			albumId,
			trackId,
			request,
			uploadHash,
		);
	}
}
