import { Controller, Get, Query } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';

@Controller('albums')
export class AlbumsController {
	constructor(private readonly albumsService: AlbumsService) {}

	@Get()
	async getAlbums(@Query('cursor') cursor: string | null) {
		return await this.albumsService.getAlbums(cursor);
	}

	@Get('/:id')
	async getAlbum(@Query('id') id: string) {
		return await this.albumsService.getAlbum(id);
	}
}
