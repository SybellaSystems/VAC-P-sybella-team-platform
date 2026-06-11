#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running Typecheck...');
  execSync('npm run typecheck', { stdio: 'inherit' });
} catch (e) {
  console.error('Typecheck failed.');
  process.exit(2);
}

try {
  console.log('Running supabase usage scan...');
  execSync('node ./scripts/scan-supabase-usage.js', { stdio: 'inherit' });
} catch (e) {
  console.error('Supabase scan failed.');
  process.exit(3);
}

console.log('Smoke checks passed.');
process.exit(0);
