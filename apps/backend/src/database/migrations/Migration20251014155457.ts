import { Migration } from '@mikro-orm/migrations';

export class Migration20251014155457 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "track_quality" add column "size_bytes" int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "track_quality" drop column "size_bytes";`);
  }

}
