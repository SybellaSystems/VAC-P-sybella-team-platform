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

  console.log('Found migrations:');
  files.forEach((f) => console.log(' -', f));

  console.log('\n--- DRY RUN: printing SQL for review ---\n');
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log('/*', file, '*/');
    console.log(sql);
    console.log('\n');
  }

  if (process.env.RUN_SQL !== 'true') {
    console.log('Set RUN_SQL=true and provide DATABASE_URL to execute migrations against a database. Skipping execution.');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not provided. Aborting execution.');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log('Executing', file);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.log('OK', file);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error executing', file, err.message);
        throw err;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
