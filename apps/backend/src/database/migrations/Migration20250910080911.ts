import { Migration } from '@mikro-orm/migrations';

export class Migration20250910080911 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "track_quality" ("id" uuid not null, "track_id" bigint not null, "type" text not null, "hash" text not null, "file_codec" text not null, "file_container" text not null, "lossless" boolean not null default false, "bitrate" int null, "sample_rate" int null, constraint "track_quality_pkey" primary key ("id"));`);
    this.addSql(`alter table "track_quality" add constraint "track_quality_hash_unique" unique ("hash");`);

    this.addSql(`alter table "track_quality" add constraint "track_quality_track_id_foreign" foreign key ("track_id") references "tracks" ("id") on update cascade;`);

    this.addSql(`alter table "tracks" drop constraint "tracks_hash_unique";`);
    this.addSql(`alter table "tracks" drop column "hash", drop column "file_codec", drop column "file_container", drop column "lossless", drop column "bitrate", drop column "sample_rate";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "track_quality" cascade;`);

    this.addSql(`alter table "tracks" add column "hash" text not null, add column "file_codec" text not null, add column "file_container" text not null, add column "lossless" boolean not null default false, add column "bitrate" int null, add column "sample_rate" int null;`);
    this.addSql(`alter table "tracks" add constraint "tracks_hash_unique" unique ("hash");`);
  }

}
