import { Module } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';
import { AlbumsController } from './albums.controller.js';
import { StorageService } from '../uploads/storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../uploads/storageServices/LocalStorageService.js';

@Module({
	controllers: [AlbumsController],
	providers: [
		AlbumsService,
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
export class AlbumsModule {}
