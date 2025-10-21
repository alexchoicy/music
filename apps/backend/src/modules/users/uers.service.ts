import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Users } from '#database/entities/users.js';
import { CreateUserRequestDTO } from '#types/dto/users.dto.js';

@Injectable()
export class UsersService {
	constructor(private readonly em: EntityManager) {}

	async getAll() {
		return await this.em.find(Users, {});
	}

	async create(createUserDto: CreateUserRequestDTO) {
		const user = this.em.create(Users, {
			username: createUserDto.username,
			displayname: createUserDto.displayName || createUserDto.username,
			password: createUserDto.password,
			role: createUserDto.role,
		});
		await this.em.persistAndFlush(user);
		return user;
	}

	async update(id: string, updateUserDto: CreateUserRequestDTO) {
		const user = await this.em.findOneOrFail(Users, { id });
		user.displayname = updateUserDto.displayName || updateUserDto.username;
		user.password = updateUserDto.password;
		user.role = updateUserDto.role;
		await this.em.persistAndFlush(user);
		return user;
	}

	async delete(id: string) {
		const user = await this.em.findOneOrFail(Users, { id });
		await this.em.removeAndFlush(user);
		return { success: true };
	}
}
