import { supabase as clientSupabase } from '@/lib/supabase';

/** Best-effort audit trail insert; ignores failures so UX is not blocked. */
export async function logAudit(params: {
  event_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  action?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown>;
}, supabaseClient?: any) {
  try {
    const supabase = supabaseClient || clientSupabase;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();

    await supabase.from('audit_logs').insert({
      auth_user_id: uid,
      actor_role: profile?.role ?? null,
      event_type: params.event_type,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      action: params.action ?? null,
      details: params.details ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    /* non-fatal */
  }
}
