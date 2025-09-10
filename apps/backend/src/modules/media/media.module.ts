import { Module } from '@nestjs/common';
import { MediaService } from './media.service.js';
import { MediaController } from './media.controller.js';

@Module({
	controllers: [MediaController],
	providers: [MediaService],
})
export class MediaModule { }
