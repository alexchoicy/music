import 'dotenv/config';

import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { SeedManager } from '@mikro-orm/seeder';
import { Migrator } from '@mikro-orm/migrations';

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: ['dist/database/entities/**/*.js'],
  entitiesTs: ['src/database/entities/**/*.ts'],
  metadataProvider: TsMorphMetadataProvider,
  extensions: [SeedManager, Migrator],
  migrations: {
    path: 'dist/database/migrations',
    pathTs: 'src/database/migrations',
  },
  debug: true,
});
