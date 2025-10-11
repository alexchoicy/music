import {
	getServices,
	StorageService,
} from '#modules/storageServices/storageServiceAbstract.js';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TracksService } from './tracks.service.js';
import { TrackController } from './tracks.controller.js';

@Module({
	controllers: [TrackController],
	providers: [
		TracksService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class TracksModule {}
