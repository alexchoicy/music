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
	seeder: {
		path: 'dist/database/seeders',
		pathTs: 'src/database/seeders',
		defaultSeeder: 'DatabaseSeeder',
		glob: '!(*.d).{js,ts}',
		emit: 'ts',
		fileName: (className: string) => className,
	},
	debug: process.env.NODE_ENV !== 'production',
});
