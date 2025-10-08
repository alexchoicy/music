import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service.js';
import { ArtistsController } from './artists.controller.js';
import {
	getServices,
	StorageService,
} from '../storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';

@Module({
	controllers: [ArtistsController],
	providers: [
		ArtistsService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class ArtistsModule {}
