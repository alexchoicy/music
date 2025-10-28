import { Migration } from '@mikro-orm/migrations';

export class Migration20251028053940 extends Migration {
	override async up(): Promise<void> {
		this.addSql(
			`create table "artists_alias" ("id" bigserial primary key, "artist_id" bigint not null, "alias" text not null, "type" text not null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now());`,
		);
		this.addSql(
			`alter table "artists_alias" add constraint "artists_alias_alias_unique" unique ("alias");`,
		);

		this.addSql(
			`alter table "artists_alias" add constraint "artists_alias_artist_id_foreign" foreign key ("artist_id") references "artists" ("id") on update cascade;`,
		);
	}

	override async down(): Promise<void> {
		this.addSql(`drop table if exists "artists_alias" cascade;`);
	}
}
