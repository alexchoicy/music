import { Migration } from '@mikro-orm/migrations';

export class Migration20251023201107 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "users" add constraint "users_username_unique" unique ("username");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop constraint "users_username_unique";`);
  }

}
