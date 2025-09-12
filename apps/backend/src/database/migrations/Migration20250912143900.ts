import { Migration } from '@mikro-orm/migrations';

export class Migration20250912143900 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "attachments" ("id" uuid not null, "entity_type" text not null, "file_type" text not null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "attachments_pkey" primary key ("id"));`);

    this.addSql(`create table "languages" ("id" bigserial primary key, "name" text not null);`);
    this.addSql(`alter table "languages" add constraint "languages_name_key" unique ("name");`);

    this.addSql(`create table "artists" ("id" bigserial primary key, "name" text not null, "language_id" bigint null, "artist_type" text check ("artist_type" in ('person', 'group', 'project')) not null, "profile_pic_id" uuid null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now());`);

    this.addSql(`create table "artist_groups" ("id" bigserial primary key, "artist_id" bigint not null);`);
    this.addSql(`alter table "artist_groups" add constraint "artist_groups_artist_id_key" unique ("artist_id");`);

    this.addSql(`create table "group_members" ("group_id" bigint not null, "artist_id" bigint not null, constraint "group_members_pkey" primary key ("group_id", "artist_id"));`);

    this.addSql(`create table "albums" ("id" bigserial primary key, "name" text not null, "year" int not null, "language_id" bigint null, "main_artist_id" bigint null, "album_type" text check ("album_type" in ('Album', 'Single', 'Compilation', 'Soundtrack', 'Live', 'Remix', 'Other')) not null default 'Album', "musicbrainz_album_id" uuid null, "cover_attachment_id" uuid null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now());`);

    this.addSql(`create table "tags" ("id" bigserial primary key, "name" text not null);`);
    this.addSql(`alter table "tags" add constraint "tags_name_key" unique ("name");`);

    this.addSql(`create table "tracks" ("id" bigserial primary key, "name" text not null, "duration_ms" int not null, "is_instrumental" boolean not null default false, "language_id" bigint null, "musicbrainz_track_id" uuid null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now());`);

    this.addSql(`create table "track_quality" ("id" uuid not null, "track_id" bigint not null, "type" text not null, "hash" text not null, "upload_hash_check" text not null, "file_codec" text not null, "file_container" text not null, "islossless" boolean not null default false, "bitrate" int null, "sample_rate" int null, "upload_status" smallint not null, "created_at" timestamp(6) not null default now(), "updated_at" timestamp(6) not null default now(), constraint "track_quality_pkey" primary key ("id"));`);
    this.addSql(`alter table "track_quality" add constraint "track_quality_hash_unique" unique ("hash");`);

    this.addSql(`create table "track_artists" ("track_id" bigint not null, "artist_id" bigint not null, constraint "track_artists_pkey" primary key ("track_id", "artist_id"));`);

    this.addSql(`create table "album_tracks" ("album_id" bigint not null, "track_id" bigint not null, "disc_no" int not null default 1, "track_no" int not null, constraint "album_tracks_pkey" primary key ("album_id", "track_id"));`);

    this.addSql(`create table "track_tags" ("track_id" bigint not null, "tag_id" bigint not null, constraint "track_tags_pkey" primary key ("track_id", "tag_id"));`);

    this.addSql(`alter table "artists" add constraint "artists_language_id_foreign" foreign key ("language_id") references "languages" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "artists" add constraint "artists_profile_pic_id_foreign" foreign key ("profile_pic_id") references "attachments" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "artist_groups" add constraint "artist_groups_artist_id_foreign" foreign key ("artist_id") references "artists" ("id") on update cascade;`);

    this.addSql(`alter table "group_members" add constraint "group_members_group_id_foreign" foreign key ("group_id") references "artist_groups" ("id") on update cascade;`);
    this.addSql(`alter table "group_members" add constraint "group_members_artist_id_foreign" foreign key ("artist_id") references "artists" ("id") on update cascade;`);

    this.addSql(`alter table "albums" add constraint "albums_language_id_foreign" foreign key ("language_id") references "languages" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "albums" add constraint "albums_main_artist_id_foreign" foreign key ("main_artist_id") references "artists" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table "albums" add constraint "albums_cover_attachment_id_foreign" foreign key ("cover_attachment_id") references "attachments" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "tracks" add constraint "tracks_language_id_foreign" foreign key ("language_id") references "languages" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table "track_quality" add constraint "track_quality_track_id_foreign" foreign key ("track_id") references "tracks" ("id") on update cascade;`);

    this.addSql(`alter table "track_artists" add constraint "track_artists_track_id_foreign" foreign key ("track_id") references "tracks" ("id") on update cascade;`);
    this.addSql(`alter table "track_artists" add constraint "track_artists_artist_id_foreign" foreign key ("artist_id") references "artists" ("id") on update cascade;`);

    this.addSql(`alter table "album_tracks" add constraint "album_tracks_album_id_foreign" foreign key ("album_id") references "albums" ("id") on update cascade;`);
    this.addSql(`alter table "album_tracks" add constraint "album_tracks_track_id_foreign" foreign key ("track_id") references "tracks" ("id") on update cascade;`);

    this.addSql(`alter table "track_tags" add constraint "track_tags_track_id_foreign" foreign key ("track_id") references "tracks" ("id") on update cascade;`);
    this.addSql(`alter table "track_tags" add constraint "track_tags_tag_id_foreign" foreign key ("tag_id") references "tags" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "artists" drop constraint "artists_profile_pic_id_foreign";`);

    this.addSql(`alter table "albums" drop constraint "albums_cover_attachment_id_foreign";`);

    this.addSql(`alter table "artists" drop constraint "artists_language_id_foreign";`);

    this.addSql(`alter table "albums" drop constraint "albums_language_id_foreign";`);

    this.addSql(`alter table "tracks" drop constraint "tracks_language_id_foreign";`);

    this.addSql(`alter table "artist_groups" drop constraint "artist_groups_artist_id_foreign";`);

    this.addSql(`alter table "group_members" drop constraint "group_members_artist_id_foreign";`);

    this.addSql(`alter table "albums" drop constraint "albums_main_artist_id_foreign";`);

    this.addSql(`alter table "track_artists" drop constraint "track_artists_artist_id_foreign";`);

    this.addSql(`alter table "group_members" drop constraint "group_members_group_id_foreign";`);

    this.addSql(`alter table "album_tracks" drop constraint "album_tracks_album_id_foreign";`);

    this.addSql(`alter table "track_tags" drop constraint "track_tags_tag_id_foreign";`);

    this.addSql(`alter table "track_quality" drop constraint "track_quality_track_id_foreign";`);

    this.addSql(`alter table "track_artists" drop constraint "track_artists_track_id_foreign";`);

    this.addSql(`alter table "album_tracks" drop constraint "album_tracks_track_id_foreign";`);

    this.addSql(`alter table "track_tags" drop constraint "track_tags_track_id_foreign";`);

    this.addSql(`drop table if exists "attachments" cascade;`);

    this.addSql(`drop table if exists "languages" cascade;`);

    this.addSql(`drop table if exists "artists" cascade;`);

    this.addSql(`drop table if exists "artist_groups" cascade;`);

    this.addSql(`drop table if exists "group_members" cascade;`);

    this.addSql(`drop table if exists "albums" cascade;`);

    this.addSql(`drop table if exists "tags" cascade;`);

    this.addSql(`drop table if exists "tracks" cascade;`);

    this.addSql(`drop table if exists "track_quality" cascade;`);

    this.addSql(`drop table if exists "track_artists" cascade;`);

    this.addSql(`drop table if exists "album_tracks" cascade;`);

    this.addSql(`drop table if exists "track_tags" cascade;`);
  }

}
