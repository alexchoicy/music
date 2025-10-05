import { Body, Controller, Post, Req } from '@nestjs/common';
import { MusicService } from './music.service.js';
import { UploadMusicInitDTO } from '#types/dto/music.dto.js';
import { UploadMusicInitResponse } from '@music/api/dto/upload.dto';
import type { Request } from 'express';

@Controller('')
export class MusicController {
	constructor(private readonly musicService: MusicService) {}

	@Post('init')
	async uploadMusicInit(
		@Req() request: Request,
		@Body() AlbumMetadatas: UploadMusicInitDTO,
	): Promise<UploadMusicInitResponse[]> {
		return await this.musicService.uploadMusicInit(AlbumMetadatas);
	}
}
