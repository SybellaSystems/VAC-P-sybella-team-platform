import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAdminProfile } from '@/lib/rbac';

export async function authorizeAdmin(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { response: NextResponse.json({ error: 'Administrator services are not configured on this server.' }, { status: 503 }) };
  }
  if (!token) {
    return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    return { response: NextResponse.json({ error: 'Invalid authentication.' }, { status: 401 }) };
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: actorError } = await service
    .from('profiles')
    .select('role, department, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError) {
    console.error('Unable to verify administrator access:', actorError.message);
    return { response: NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 }) };
  }
  if (!actor?.is_active || !isAdminProfile(actor)) {
    return { response: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }) };
  }

  return { service, userId: authData.user.id };
}
