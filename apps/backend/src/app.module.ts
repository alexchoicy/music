import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module, OnModuleInit } from '@nestjs/common';
import dbConfig from './mikro-orm.config.js';
import { MikroORM } from '@mikro-orm/postgresql';

@Module({
  imports: [MikroOrmModule.forRoot(dbConfig)],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  async onModuleInit() {
    await this.orm.getMigrator().up();
  }
}
