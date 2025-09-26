import { Users } from '#database/entities/users.js';
import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import 'dotenv/config';

export class DatabaseSeeder extends Seeder {
	async run(em: EntityManager): Promise<void> {
		const exists = await em.findOne(Users, { username: 'admin' });
		if (!exists) {
			const user = em.create(Users, {
				username: 'admin',
				password: process.env.ADMIN_PASSWORD || 'admin',
				displayname: 'Administrator',
				role: 'admin',
			});
			await em.persistAndFlush(user);
		}
	}
}
