import { Migration } from '@mikro-orm/migrations';

export class Migration20250910093021 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "track_quality" add column "created_at" timestamp(6) not null default now(), add column "updated_at" timestamp(6) not null default now();`);
    this.addSql(`alter table "track_quality" rename column "lossless" to "islossless";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "track_quality" drop column "created_at", drop column "updated_at";`);

    this.addSql(`alter table "track_quality" rename column "islossless" to "lossless";`);
  }

}
