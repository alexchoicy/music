import { Migration } from '@mikro-orm/migrations';

export class Migration20250910081515 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "tracks" drop column "upload_hash_check", drop column "upload_status";`);

    this.addSql(`alter table "track_quality" add column "upload_hash_check" text not null, add column "upload_status" smallint not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tracks" add column "upload_hash_check" text not null, add column "upload_status" smallint not null;`);

    this.addSql(`alter table "track_quality" drop column "upload_hash_check", drop column "upload_status";`);
  }

}
