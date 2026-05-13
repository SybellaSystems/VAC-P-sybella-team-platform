import { createClient } from '@supabase/supabase-js';

/** Placeholders allow `next build` when env vars are not present locally; set real values in production. */
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb-publishable-placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
