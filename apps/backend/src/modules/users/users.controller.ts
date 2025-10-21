import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
} from '@nestjs/common';

import { UsersService } from './uers.service.js';
import { Roles } from '#decorators/roles.decorator.js';
import { CreateUserRequestDTO } from '#types/dto/users.dto.js';

@Roles(['admin'])
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get()
	async getAll() {
		return this.usersService.getAll();
	}

	@Post()
	async create(@Body() createUserDto: CreateUserRequestDTO) {
		return this.usersService.create(createUserDto);
	}

	@Put(':id')
	async update(
		@Param('id') id: string,
		@Body() updateUserDto: CreateUserRequestDTO,
	) {
		return this.usersService.update(id, updateUserDto);
	}

	@Delete(':id')
	async delete(@Param('id') id: string) {
		return this.usersService.delete(id);
	}
}
