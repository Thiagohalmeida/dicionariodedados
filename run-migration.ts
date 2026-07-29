import 'dotenv/config';
import postgres from 'postgres';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL + '?sslmode=require';
  const client = postgres(connectionString, { max: 1 });
  
  try {
    console.log('Creating enum type...');
    await client`CREATE TYPE "formula_type" AS ENUM ('nao', 'sim', 'suporte');`;
    console.log('Created formula_type enum');
    
    console.log('Running migration...');
    await client`ALTER TABLE "fields" ADD COLUMN "formula" "formula_type" DEFAULT 'nao' NOT NULL;`;
    console.log('Added formula column');
    await client`ALTER TABLE "fields" ADD COLUMN "excluded" boolean DEFAULT false NOT NULL;`;
    console.log('Added excluded column');
    await client`ALTER TABLE "fields" ADD COLUMN "custom_internal_platform" text;`;
    console.log('Added custom_internal_platform column');
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();