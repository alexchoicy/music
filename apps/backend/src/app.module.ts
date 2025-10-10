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
import { JwtAuthGuard } from '#guards/auth.guard.js';

import { AuthModule } from '#modules/auth/auth.module.js';
import { UploadsModule } from '#modules/uploads/uploads.module.js';
import { AlbumsModule } from '#modules/albums/albums.module.js';
import { MediaModule } from '#modules/media/media.module.js';
import { ArtistsModule } from '#modules/artists/artists.module.js';
import { MigrationsModule } from '#modules/migrations/migrations.module.js';
import { wsEventsModule } from './modules/ws/wsEvents.module.js';

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
		AuthModule,
		UploadsModule,
		AlbumsModule,
		MediaModule,
		ArtistsModule,
		MigrationsModule,
		wsEventsModule,
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
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
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
