import { Module } from '@nestjs/common';
import { AlbumsService } from './albums.service.js';
import { AlbumsController } from './albums.controller.js';

@Module({
	controllers: [AlbumsController],
	providers: [AlbumsService],
})
export class AlbumsModule {}
