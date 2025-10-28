import { Migration } from '@mikro-orm/migrations';

export class Migration20251028025519 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "artists" add column "aliases" text[] not null, add column "music_brainz_id" text null, add column "area" text null, add column "spotify_id" text null, add column "twitter_name" text null, add column "profile_banner_id" uuid null;`);
    this.addSql(`alter table "artists" add constraint "artists_profile_banner_id_foreign" foreign key ("profile_banner_id") references "attachments" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "artists" drop constraint "artists_profile_banner_id_foreign";`);

    this.addSql(`alter table "artists" drop column "aliases", drop column "music_brainz_id", drop column "area", drop column "spotify_id", drop column "twitter_name", drop column "profile_banner_id";`);
  }

}
