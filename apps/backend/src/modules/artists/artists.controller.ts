import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service.js';

@Controller('artists')
export class ArtistsController {
	constructor(private readonly artistsService: ArtistsService) {}

	@Get()
	async getArtists(@Query('cursor') cursor: string | null) {
		return await this.artistsService.getArtists(cursor);
	}

	@Get('/:id')
	async getArtist(@Param('id') id: string) {
		return await this.artistsService.getArtist(id);
	}
}
