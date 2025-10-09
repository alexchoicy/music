import { Module } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';
import { AlbumsController } from './albums.controller.js';
import {
	getServices,
	StorageService,
} from '../storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';

@Module({
	controllers: [AlbumsController],
	providers: [
		AlbumsService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class AlbumsModule {}
