import { createClient } from '@supabase/supabase-js';

// Note: We intentionally don't hard-require env vars at import-time.
// In Next.js, server-side bundles/build steps may not have NEXT_PUBLIC_* vars available.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in your environment (or .env) before running the app.`
    );
  }
  return value;
}


// Use server-safe env vars for server-side code, and NEXT_PUBLIC_* for client-side.
// This prevents Next.js server builds (e.g. API routes) from crashing when NEXT_PUBLIC_* are not available.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL). Set it in your environment (or .env) before running the app.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY). Set it in your environment (or .env) before running the app.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

