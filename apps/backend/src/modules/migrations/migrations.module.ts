import { Module } from '@nestjs/common';

import { MigrationsController } from './migrations.controller.js';
import { MigrationsService } from './migrations.service.js';
import {
	StorageService,
	getServices,
} from '#modules/storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';

@Module({
	controllers: [MigrationsController],
	providers: [
		MigrationsService,
		{
			provide: StorageService,
			useFactory: (config: ConfigService) => {
				return getServices(config);
			},
			inject: [ConfigService],
		},
	],
})
export class MigrationsModule {}
