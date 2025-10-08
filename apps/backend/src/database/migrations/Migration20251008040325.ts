import { Migration } from '@mikro-orm/migrations';

export class Migration20251008040325 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "tracks" add column "is_mc" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tracks" drop column "is_mc";`);
  }

}
