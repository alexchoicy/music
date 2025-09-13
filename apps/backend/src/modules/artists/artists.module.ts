import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service.js';
import { ArtistsController } from './artists.controller.js';
import { StorageService } from '../storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../storageServices/LocalStorageService.js';

@Module({
	controllers: [ArtistsController],
	providers: [
		ArtistsService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				let storageService: StorageService;
				switch (config.get('app.storage.type')) {
					case 'local':
						storageService = new LocalStorageService(config);
						break;
					default:
						throw new Error(
							`Unsupported storage type: ${config.get(
								'app.storage.type',
							)}`,
						);
				}
				return storageService;
			},
			inject: [ConfigService],
		},
	],
})
export class ArtistsModule {}
