import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase env vars');
}

/**
 * SAFE CLIENT (never null, never breaks TS)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SERVER-SAFE CLIENT (use inside API routes only)
 */
export function createServerSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error('Missing server Supabase env vars');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}