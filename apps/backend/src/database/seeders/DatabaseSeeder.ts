import { Users } from '#database/entities/users.js';
import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import 'dotenv/config';

export class DatabaseSeeder extends Seeder {
	async run(em: EntityManager): Promise<void> {
		const adminExists = await em.findOne(Users, { username: 'admin' });
		if (!adminExists) {
			const user = em.create(Users, {
				username: 'admin',
				password: process.env.ADMIN_PASSWORD || 'admin',
				displayname: 'Administrator',
				role: 'admin',
			});
			await em.persistAndFlush(user);
		}

		if (process.env.CREATE_USER === 'true') {
			const userExists = await em.findOne(Users, { username: 'user' });
			if (!userExists) {
				const user = em.create(Users, {
					username: 'user',
					password: process.env.USER_PASSWORD || 'user',
					displayname: 'User',
					role: 'user',
				});
				await em.persistAndFlush(user);
			}
		}
	}
}
