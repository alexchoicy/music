import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, OnModuleInit } from '@nestjs/common';
import dbConfig from './mikro-orm.config.js';
import { MikroORM } from '@mikro-orm/postgresql';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { ConfigModule } from '@nestjs/config';
import config, { EnvSchema } from './utils/config.js';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { BaseController } from './modules/base.controller.js';
import { AlbumsModule } from './modules/albums/albums.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { ArtistsModule } from './modules/artists/artists.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DatabaseSeeder } from '#database/seeders/DatabaseSeeder.js';
import { JwtAuthGuard } from './guards/auth.guard.js';
import { JWKSProvider } from '#modules/auth/issuer/jwks.provider.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: (env) => {
				const res = EnvSchema.safeParse(env);
				if (!res.success) {
					console.error(res.error.issues);
					throw new Error(
						'Invalid config:\n' + JSON.stringify(res.error.issues),
					);
				}
				return res.data;
			},
			load: [config],
		}),
		MikroOrmModule.forRoot(dbConfig),
		UploadsModule,
		AlbumsModule,
		MediaModule,
		ArtistsModule,
		AuthModule,
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
