import { Migration } from '@mikro-orm/migrations';

export class Migration20251028045940 extends Migration {
	override async up(): Promise<void> {
		this.addSql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
	}

	override async down(): Promise<void> {
		this.addSql(`DROP EXTENSION IF EXISTS pg_trgm;`);
	}
}
