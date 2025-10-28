import { Migration } from '@mikro-orm/migrations';

export class Migration20251028054231 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`alter table "artists_alias" drop constraint "artists_alias_alias_unique";`,
		);

		this.addSql(`
			CREATE INDEX IF NOT EXISTS "artists_alias_trgm_idx"
			ON "artists_alias" USING gin (("alias" COLLATE "C") gin_trgm_ops);
		`);
		this.addSql(
			`create index "artists_alias_artist_idx" on "artists_alias" ("artist_id");`,
		);
		this.addSql(
			`alter table "artists_alias" add constraint "uniq_artist_alias" unique ("artist_id", "alias");`,
		);

		this.addSql(`
      CREATE INDEX artists_name_trgm_idx
      ON artists USING gin ((name COLLATE "C") gin_trgm_ops);
		`);
	}

	override async down(): Promise<void> {
		this.addSql(
			`alter table "artists_alias" add constraint "artists_alias_alias_unique" unique ("alias");`,
		);
		this.addSql(`drop index "artists_alias_trgm_idx";`);

		this.addSql(`drop index "artists_alias_artist_idx";`);

		this.addSql(
			`alter table "artists_alias" drop constraint "uniq_artist_alias";`,
		);

		this.addSql(`drop index "artists_name_trgm_idx";`);
	}
}
