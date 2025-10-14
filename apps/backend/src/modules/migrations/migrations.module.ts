import { Module } from '@nestjs/common';

import { MigrationsController } from './migrations.controller.js';
import { MigrationsService } from './migrations.service.js';
import {
	StorageService,
	getServices,
} from '#modules/storageServices/storageServiceAbstract.js';
import { ConfigService } from '@nestjs/config';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';

@Module({
	controllers: [MigrationsController],
	providers: [
		MigrationsService,
		JWKSProvider,
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
