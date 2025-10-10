import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ArtistsService } from './artists.service.js';
import { ArtistRelationshipDTO } from '#types/dto/music.dto.js';
import { Public } from '#decorators/public.decorator.js';

@Controller('artists')
export class ArtistsController {
	constructor(private readonly artistsService: ArtistsService) {}

	@Get()
	async getArtists() {
		return await this.artistsService.getArtists();
	}

	@Get('/:id')
	async getArtist(@Param('id') id: string) {
		return await this.artistsService.getArtist(id);
	}

	@Public()
	@Get('/:id/meta')
	async getArtistMeta(@Param('id') id: string) {
		const artist = await this.artistsService.getArtist(id);
		return {
			artist: artist.name,
			cover: artist.image || artist.albums[0].cover,
		};
	}

	@Post('/:id')
	async setArtistGroup(
		@Param('id') id: string,
		@Body() artistsRelationShip: ArtistRelationshipDTO,
	) {
		return await this.artistsService.setArtistRelationship(
			id,
			artistsRelationShip,
		);
	}
}
