import { Controller, Post } from '@nestjs/common';
import { MigrationsService } from './migrations.service.js';
import { Roles } from '#decorators/roles.decorator.js';

@Roles(['admin'])
@Controller('migrations')
export class MigrationsController {
	constructor(private readonly migrationService: MigrationsService) {}

	@Post('cover')
	async migrateAlbumCovers() {
		return this.migrationService.migrateAlbumCovers();
	}

	@Post('quality')
	async migrateMusicQualityData() {
		return this.migrationService.migrateMusicQualityData();
	}
}
