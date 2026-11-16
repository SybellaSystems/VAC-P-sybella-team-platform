import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminProfile } from '@/lib/rbac';

export const runtime = 'nodejs';

const ROLES = new Set([
  'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'finance', 'legal_counsel',
  'marketing_manager', 'customer_support', 'operations', 'intern', 'partner',
  'executive', 'marketing', 'technical', 'legal', 'project', 'product',
]);

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'User invitations are not configured on this server.' }, { status: 503 });
  }
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Invalid authentication.' }, { status: 401 });

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: actorError } = await service
    .from('profiles')
    .select('role, department, is_active')
    .eq('id', authData.user.id)
    .maybeSingle();
  if (actorError) return NextResponse.json({ error: 'Unable to verify administrator access.' }, { status: 500 });
  if (!actor?.is_active || !isAdminProfile(actor)) {
    return NextResponse.json({ error: 'Only administrators and directors can invite users.' }, { status: 403 });
  }

  let payload: {
    email?: string;
    full_name?: string;
    title?: string;
    role?: string;
    department_id?: string | null;
    joining_date?: string | null;
    supervisor_id?: string | null;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'A valid JSON request is required.' }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const fullName = payload.full_name?.trim();
  const role = payload.role || 'intern';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || fullName.length > 160 || !ROLES.has(role) || !payload.department_id) {
    return NextResponse.json({ error: 'Provide a valid email, full name, supported role, and department.' }, { status: 400 });
  }
  const { data: department, error: departmentError } = await service.from('departments').select('id, name').eq('id', payload.department_id).maybeSingle();
  if (departmentError || !department) return NextResponse.json({ error: 'Select a valid department.' }, { status: 400 });
  if (payload.supervisor_id) {
    const { data: supervisor, error } = await service.from('profiles').select('id, is_active, department_id').eq('id', payload.supervisor_id).maybeSingle();
    if (error || !supervisor?.is_active || supervisor.department_id !== payload.department_id) {
      return NextResponse.json({ error: 'Select an active supervisor in the assigned department.' }, { status: 400 });
    }
  }

  const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/login`,
  });
  if (inviteError || !invited.user) {
    return NextResponse.json({ error: inviteError?.message || 'Unable to invite this user.' }, { status: 400 });
  }

  const { error: updateError } = await service.from('profiles').update({
    full_name: fullName,
    role,
    title: payload.title?.trim().slice(0, 120) || '',
    department_id: payload.department_id,
    department: department.name,
    joining_date: payload.joining_date || new Date().toISOString().slice(0, 10),
    supervisor_id: payload.supervisor_id || null,
  }).eq('id', invited.user.id);

  if (updateError) {
    await service.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: `Invitation created but profile setup failed: ${updateError.message}` }, { status: 500 });
  }

  if (role === 'partner' && payload.department_id) {
    const { error: accessError } = await service.from('partner_department_access').upsert({
      partner_id: invited.user.id,
      department_id: payload.department_id,
      granted_by: authData.user.id,
    });
    if (accessError) {
      await service.auth.admin.deleteUser(invited.user.id);
      return NextResponse.json({ error: `Invitation created but partner access could not be configured: ${accessError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ user_id: invited.user.id, message: 'Invitation sent.' }, { status: 201 });
}
