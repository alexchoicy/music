import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, OnModuleInit } from '@nestjs/common';
import dbConfig from './mikro-orm.config.js';
import { MikroORM } from '@mikro-orm/postgresql';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { ConfigModule } from '@nestjs/config';
import config, { EnvSchema } from './utils/config.js';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { BaseController } from './modules/base.controller.js';
import { AlbumsModule } from './modules/albums/albums.module.js';

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
	],
	controllers: [BaseController],
	providers: [
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
	}
}
