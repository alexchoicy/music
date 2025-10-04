import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Users } from '#database/entities/users.js';

@Injectable()
export class AuthService {
	constructor(private readonly em: EntityManager) {}

	async validateUser(username: string, password: string) {
		const user = await this.em.findOne(
			Users,
			{ username },
			{ populate: ['password'] },
		);
		if (!user) {
			throw new NotFoundException('User not found');
		}

		const isPasswordValid = await user.verifyPassword(password);

		if (!isPasswordValid) {
			throw new NotFoundException('Invalid credentials');
		}

		return user;
	}
}
