import { Module } from '@nestjs/common';
import { MusicService } from './music.service.js';
import { MusicController } from './music.controller.js';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../../storageServices/LocalStorageService.js';
import { StorageService } from '../../storageServices/storageServiceAbstract.js';

@Module({
	controllers: [MusicController],
	providers: [
		MusicService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				let storageService: StorageService;
				switch (config.get('appConfig.storage.type')) {
					case 'local':
						storageService = new LocalStorageService(config);
						break;
					default:
						throw new Error(
							`Unsupported storage type: ${config.get(
								'appConfig.storage.type',
							)}`,
						);
				}
				return storageService;
			},
			inject: [ConfigService],
		},
	],
})
export class MusicModule {}
