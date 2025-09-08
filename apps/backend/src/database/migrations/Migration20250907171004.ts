import { Migration } from '@mikro-orm/migrations';

export class Migration20250907171004 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "tracks" add column "file_container" text not null, add column "lossless" boolean not null default false;`);
    this.addSql(`alter table "tracks" rename column "file_type" to "file_codec";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tracks" drop column "file_container", drop column "lossless";`);

    this.addSql(`alter table "tracks" rename column "file_codec" to "file_type";`);
  }

}
