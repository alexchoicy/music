import { Migration } from '@mikro-orm/migrations';

export class Migration20251021051135 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "web_auth" add column "name" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "web_auth" drop column "name";`);
  }

}
