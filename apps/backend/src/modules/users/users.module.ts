import { Module } from '@nestjs/common';
import { UsersService } from './uers.service.js';
import { UsersController } from './users.controller.js';

@Module({
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}
