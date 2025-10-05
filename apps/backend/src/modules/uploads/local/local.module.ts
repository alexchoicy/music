import { Module } from '@nestjs/common';
import { LocalService } from './local.service.js';
import { LocalController } from './local.controller.js';

@Module({
	controllers: [LocalController],
	providers: [LocalService],
})
export class LocalModule {}
