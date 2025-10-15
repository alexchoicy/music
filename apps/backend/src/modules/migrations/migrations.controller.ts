import { Controller, Post } from '@nestjs/common';
import { MigrationsService } from './migrations.service.js';
import { Admin } from '#decorators/admin.decorator.js';

@Admin()
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
