import { Controller, Put } from '@nestjs/common';
import { MigrationsService } from './migrations.service.js';
import { Roles } from '#decorators/roles.decorator.js';

@Roles(['admin'])
@Controller('migrations')
export class MigrationsController {
	constructor(private readonly migrationService: MigrationsService) {}

	@Put('cover')
	async migrateAlbumCovers() {
		return this.migrationService.migrateAlbumCovers();
	}

	@Put('quality')
	async migrateMusicQualityData() {
		return this.migrationService.migrateMusicQualityData();
	}

	@Put('musicBrainzAliases')
	async migrateMusicBrainzAliases() {
		return this.migrationService.getMusicBrainzData();
	}

	@Put('twitterImages')
	async migrateTwitterImages() {
		return this.migrationService.getArtistImageAndBannerWithTwitter();
	}
}
