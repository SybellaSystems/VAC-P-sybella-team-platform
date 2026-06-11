import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function buildSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars are missing. Returning a stub client for build-time execution only.');

    const stub = {
      from: () => ({ select: async () => ({ data: null, error: new Error('Supabase is not configured.') }) }),
      auth: { signIn: async () => null, signOut: async () => null },
      storage: { from: () => ({ upload: async () => ({ data: null, error: new Error('Supabase storage unavailable.') }) }) },
      rpc: async () => ({ data: null, error: new Error('Supabase RPC unavailable.') }),
      functions: { invoke: async () => ({ data: null, error: new Error('Supabase functions unavailable.') }) },
    } as any;

    return stub;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = buildSupabaseClient();

/**
 * SERVER-SAFE CLIENT (use inside API routes only)
 */
export function createServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing server Supabase env vars');
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}