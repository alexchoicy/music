import { Module } from '@nestjs/common';
import { MusicService } from './music.service.js';
import { MusicController } from './music.controller.js';
import { ConfigService } from '@nestjs/config';
import {
	getServices,
	StorageService,
} from '../../storageServices/storageServiceAbstract.js';

@Module({
	controllers: [MusicController],
	providers: [
		MusicService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class MusicModule {}
