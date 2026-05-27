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

// Don’t hard-crash the entire Next build during local compilation.
// If Supabase is not configured, server handlers can return 500 with a clear message
// when they first need to use the client.
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
})();

export function getSupabaseOrThrow() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY).'
    );
  }
  return supabase;
}


