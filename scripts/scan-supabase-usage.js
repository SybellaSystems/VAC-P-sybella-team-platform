#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();

function walk(dir, cb) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      walk(full, cb);
    } else {
      cb(full);
    }
  });
}

const matches = [];

walk(root, (file) => {
  if (!file.match(/\.(ts|tsx|js|jsx)$/)) return;
  if (file.includes('node_modules')) return;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes("from '@/lib/supabase'") || content.includes("require('@/lib/supabase')")) {
    matches.push(file.replace(root + path.sep, ''));
  }
});

if (matches.length === 0) {
  console.log('No direct imports of client supabase detected.');
  process.exit(0);
}

console.log('Files importing the client `supabase` module:');
matches.forEach((m) => console.log(' -', m));

console.log('\nRecommendation: review these files and ensure server-only endpoints use createServerSupabase()');
process.exit(0);
