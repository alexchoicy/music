import { Migration } from '@mikro-orm/migrations';

export class Migration20250908065051 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "tracks" add column "upload_hash_check" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tracks" drop column "upload_hash_check";`);
  }

}
