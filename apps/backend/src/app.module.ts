import { Module, OnModuleInit } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

import { ConfigModule } from '@nestjs/config';
import appConfig from './config/appConfig.js';
import { EnvSchema } from './config/env.js';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM } from '@mikro-orm/postgresql';
import { DatabaseSeeder } from '#database/seeders/DatabaseSeeder.js';
import dbConfig from './mikro-orm.config.js';

import { BaseController } from './modules/base.controller.js';

import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: (env) => {
				const res = EnvSchema.safeParse(env);
				if (!res.success) {
					throw new Error(
						'Invalid config:\n' + JSON.stringify(res.error.issues),
					);
				}
				return res.data;
			},
			load: [appConfig],
		}),
		MikroOrmModule.forRoot(dbConfig),
	],
	controllers: [BaseController],
	providers: [
		JWKSProvider,
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},
	],
})
export class AppModule implements OnModuleInit {
	constructor(private readonly orm: MikroORM) {}
	async onModuleInit() {
		await this.orm.getMigrator().up();
		await this.orm.getSeeder().seed(DatabaseSeeder);
	}
}
