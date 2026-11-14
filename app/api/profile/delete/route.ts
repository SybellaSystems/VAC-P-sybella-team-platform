import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Profile deletion is not configured on this server.' }, { status: 503 });
  }
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error: authError } = await authClient.auth.getUser(token);
  if (authError || !data.user) return NextResponse.json({ error: 'Invalid authentication.' }, { status: 401 });

  const { error: anonymizeError } = await authClient.rpc('vacp_anonymize_own_profile');
  if (anonymizeError) {
    return NextResponse.json({ error: anonymizeError.message || 'Unable to anonymize profile data.' }, { status: 500 });
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: banError } = await service.auth.admin.updateUserById(data.user.id, {
    email: `deleted+${data.user.id}@deleted.invalid`,
    user_metadata: {},
    ban_duration: '876000h',
  });
  if (banError) {
    console.error('Profile was anonymized but authentication could not be disabled:', banError.message);
    return NextResponse.json({
      error: 'Profile data was anonymized, but account access could not be disabled. Contact an administrator immediately.',
    }, { status: 500 });
  }

  return NextResponse.json({ message: 'Personal profile data erased. Historical KPI and approval records remain with anonymized attribution.' });
}
