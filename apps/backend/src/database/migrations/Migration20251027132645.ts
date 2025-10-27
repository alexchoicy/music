import { Migration } from '@mikro-orm/migrations';

export class Migration20251027132645 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "users" drop constraint if exists "users_role_check";`);

    this.addSql(`alter table "users" add constraint "users_role_check" check("role" in ('user', 'admin', 'uploader'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "users" drop constraint if exists "users_role_check";`);

    this.addSql(`alter table "users" add constraint "users_role_check" check("role" in ('user', 'admin'));`);
  }

}
