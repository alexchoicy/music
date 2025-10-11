import { Migration } from '@mikro-orm/migrations';

export class Migration20251011182124 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "web_auth" add column "credential_id" text not null;`);
    this.addSql(`alter table "web_auth" alter column "id" drop default;`);
    this.addSql(`alter table "web_auth" alter column "id" type uuid using ("id"::text::uuid);`);
    this.addSql(`alter table "web_auth" rename column "public_key" to "public_key_blob";`);
    this.addSql(`alter table "web_auth" rename column "transports" to "device";`);
    this.addSql(`alter table "web_auth" add constraint "web_auth_credential_id_unique" unique ("credential_id");`);
    this.addSql(`create index "webauth_user_id_index" on "web_auth" ("web_auth_user_id");`);
    this.addSql(`alter table "web_auth" add constraint "web_auth_web_auth_user_id_user_id_unique" unique ("web_auth_user_id", "user_id");`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "web_auth" alter column "id" type text using ("id"::text);`);

    this.addSql(`alter table "web_auth" drop constraint "web_auth_credential_id_unique";`);
    this.addSql(`drop index "webauth_user_id_index";`);
    this.addSql(`alter table "web_auth" drop constraint "web_auth_web_auth_user_id_user_id_unique";`);
    this.addSql(`alter table "web_auth" drop column "credential_id";`);

    this.addSql(`alter table "web_auth" alter column "id" type varchar(255) using ("id"::varchar(255));`);
    this.addSql(`alter table "web_auth" rename column "public_key_blob" to "public_key";`);
    this.addSql(`alter table "web_auth" rename column "device" to "transports";`);
  }

}
