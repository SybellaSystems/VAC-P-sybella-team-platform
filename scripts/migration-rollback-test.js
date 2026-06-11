#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL must be set to run rollback tests.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log('Running rollback test for migrations:');
    for (const file of files) {
      console.log(' -', file);
    }
    console.log('');

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Testing migration ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('ROLLBACK');
        console.log(`  OK ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  FAILED ${file}`);
        console.error(error.message);
        process.exit(2);
      }
    }

    console.log('All migrations can execute and rollback cleanly.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
