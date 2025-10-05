import { Controller, Get, Param } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';
import { ApiQuery } from '@nestjs/swagger';

@Controller('albums')
export class AlbumsController {
	constructor(private readonly albumsService: AlbumsService) {}

	@Get()
	@ApiQuery({
		name: 'cursor',
		required: false,
		type: String,
	})
	async getAlbums() {
		return await this.albumsService.getAlbums();
	}

	@Get('/:id')
	async getAlbum(@Param('id') id: string) {
		return await this.albumsService.getAlbum(id);
	}
}
