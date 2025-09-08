import { Module } from '@nestjs/common';
import { MusicModule } from './music/music.module.js';
import { RouterModule } from '@nestjs/core';
import { LocalModule } from './local/local.module.js';

@Module({
	controllers: [],
	providers: [],
	imports: [
		MusicModule,
		LocalModule,
		RouterModule.register([
			{
				path: 'uploads',
				children: [
					{
						path: 'musics',
						module: MusicModule,
					},
					{
						path: 'local',
						module: LocalModule,
					},
				],
			},
		]),
	],
})
export class UploadsModule {}
