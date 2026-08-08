import { supabase } from '@/lib/supabase';

/** Best-effort audit trail insert; ignores failures so UX is not blocked. */
export async function logAudit(params: {
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  event_type?: string;
  metadata?: any;
}) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;

    // Combine metadata or event_type into details if needed, or expand the table/params.
    // For now, this safely supports all properties passed across the app without type errors.
    let fullDetails = params.details ?? '';
    if (params.event_type) {
      fullDetails = `event_type=${params.event_type} ${fullDetails}`.trim();
    }
    if (params.metadata) {
      const metaStr = typeof params.metadata === 'object' ? JSON.stringify(params.metadata) : String(params.metadata);
      fullDetails = `${fullDetails} metadata=${metaStr}`.trim();
    }

    await supabase.from('audit_logs').insert({
      user_id: uid,
      action: params.action,
      entity_type: params.entity_type ?? null,
      entity_id: params.entity_id ?? null,
      details: fullDetails || null,
    });
  } catch {
    /* non-fatal */
  }
}