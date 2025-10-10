import { Controller, Get, Param } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';
import { ApiQuery } from '@nestjs/swagger';
import { Public } from '#decorators/public.decorator.js';

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

	@Public()
	@Get('/:id/meta')
	async getAlbumMeta(@Param('id') id: string) {
		const album = await this.albumsService.getAlbum(id);
		return {
			name: album.name,
			artist: album.mainArtist.name,
			cover: album.cover,
		};
	}
}
