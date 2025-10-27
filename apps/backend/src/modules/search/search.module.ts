import { Module } from '@nestjs/common';

import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import {
	StorageService,
	getServices,
} from '#modules/storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';

@Module({
	controllers: [SearchController],
	providers: [
		SearchService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class SearchModule {}
