import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use server-safe env vars for server-side code, and NEXT_PUBLIC_* for client-side.
// This prevents Next.js server builds (e.g. API routes) from crashing when NEXT_PUBLIC_* are not available.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY).'
  );
}

// After the check above, TypeScript still sees these as string | undefined
// We need to assert they are strings since we've verified they exist
const url = supabaseUrl as string;
const anonKey = supabaseAnonKey as string;

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(url, anonKey);
  }
  return supabaseClient;
}

// For backward compatibility, export a getter that throws if not configured
export const supabase = getSupabase();