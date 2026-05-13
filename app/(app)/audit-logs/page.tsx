'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Input } from '@/components/ui/input';

type AuditRow = {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  details: string | null;
  actor_role: string | null;
  created_at: string;
};

const allowedRoles = new Set(['admin', 'director']);

export default function AuditLogsPage() {
  useDocumentTitle('Audit logs | VAC-P');
  const { profile } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!profile?.role || !allowedRoles.has(profile.role)) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('audit_logs')
        .select('id, event_type, entity_type, entity_id, action, details, actor_role, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!mounted) return;
      setRows((data as AuditRow[]) ?? []);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [profile?.role]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const hay = `${r.event_type} ${r.entity_type ?? ''} ${r.action ?? ''} ${r.details ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q]);

  if (!profile?.role || !allowedRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Audit logs" subtitle="Compliance trail" />
        <div className="p-6 max-w-lg mx-auto text-center text-muted-foreground text-sm">
          Only administrators and directors can view the audit log.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Audit logs" subtitle="Immutable record of sensitive actions" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by event, entity, or details…" className="max-w-md bg-white" />
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries match.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-foreground">{r.event_type}</p>
                  <time className="text-[10px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {[r.entity_type, r.entity_id, r.action].filter(Boolean).join(' · ') || '—'}
                </p>
                {r.details ? <p className="text-sm text-foreground/80 mt-2">{r.details}</p> : null}
                <p className="text-[10px] text-muted-foreground mt-2">Actor role: {r.actor_role ?? '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
