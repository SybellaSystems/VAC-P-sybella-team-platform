'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';

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

export default function AuditLogsPage() {
  useDocumentTitle('Audit Logs | VAC-P');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
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

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => {
      const hay = `${r.event_type} ${r.entity_type ?? ''} ${r.action ?? ''} ${r.details ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [rows, q]);

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Audit &amp; Compliance</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Activity Trail</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Immutable record of sensitive actions and approvals (visibility per role).</p>
        </header>

        <div className="flex items-center gap-3 mb-8">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter events..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {loading ? (
          <div className="text-white/30 text-sm">Loading audit trail...</div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-white/30 text-sm">No audit entries match.</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-3xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-black text-sm">{r.event_type}</div>
                      <div className="text-white/40 text-xs mt-1">
                        {[r.entity_type, r.entity_id, r.action].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <div className="text-white/30 text-[10px] uppercase font-black tracking-widest whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  {r.details ? <p className="text-white/60 text-sm mt-3">{r.details}</p> : null}
                  <div className="text-white/20 text-[10px] mt-3">Role: {r.actor_role ?? '—'}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
