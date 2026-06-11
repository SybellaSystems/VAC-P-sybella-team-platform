import { createServerSupabase } from '@/lib/supabase';

export async function requireUser(supabaseClient?: any) {
  const supabase = supabaseClient || createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(supabaseClient: any, userId: string, allowedRoles: string[] = ['admin', 'owner']) {
  const supabase = supabaseClient || createServerSupabase();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  const role = profile?.role ?? null;
  if (!role || !allowedRoles.includes(role)) throw new Error('Forbidden');
  return role;
}
