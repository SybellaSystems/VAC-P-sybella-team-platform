'use client';

import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, ExternalLink, FileCheck2, TriangleAlert, X } from 'lucide-react';

type Entry = {
  id: string;
  user_id: string;
  entry_date: string;
  submitted_at: string | null;
};

type Member = { id: string; full_name: string; department: string; role: string };
type Kpi = { id: string; title: string; unit: string; target: number; proof_type: string };
type Item = { entry_id: string; kpi_id: string; number_value: number | null; proof_url: string | null; note: string };

type ReviewCard = Entry & { member: Member; items: Item[] };

export default function DailyApprovalsPage() {
  const { profile } = useAuth();
  const canReview = ['admin', 'director', 'manager'].includes(profile?.role || '');
  const [entries, setEntries] = useState<ReviewCard[]>([]);
  const [kpis, setKpis] = useState<Record<string, Kpi>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    if (!profile || !canReview) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data: entryData, error: entryError } = await supabase
      .from('daily_entries')
      .select('id, user_id, entry_date, submitted_at')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    if (entryError) {
      console.error('Failed to load daily approvals:', entryError);
      setError(entryError.message || 'Could not load pending daily entries.');
      setLoading(false);
      return;
    }

    const pending = (entryData || []) as Entry[];
    if (pending.length === 0) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const [memberResult, itemResult, kpiResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, department, role').in('id', Array.from(new Set(pending.map((item) => item.user_id)))),
      supabase.from('daily_entry_items').select('*').in('entry_id', pending.map((item) => item.id)),
      supabase.from('daily_kpis').select('id, title, unit, target, proof_type'),
    ]);

    const queryError = memberResult.error || itemResult.error || kpiResult.error;
    if (queryError) {
      console.error('Failed to load daily approval details:', queryError);
      setError(queryError.message || 'Could not load approval details.');
      setLoading(false);
      return;
    }

    const memberMap = new Map((memberResult.data || []).map((member) => [member.id, member as Member]));
    const itemsByEntry = new Map<string, Item[]>();
    ((itemResult.data || []) as Item[]).forEach((item) => {
      itemsByEntry.set(item.entry_id, [...(itemsByEntry.get(item.entry_id) || []), item]);
    });
    const kpiMap: Record<string, Kpi> = {};
    (kpiResult.data || []).forEach((item) => { kpiMap[item.id] = item as Kpi; });
    setKpis(kpiMap);
    setEntries(pending.flatMap((item) => {
      const member = memberMap.get(item.user_id);
      return member ? [{ ...item, member, items: itemsByEntry.get(item.id) || [] }] : [];
    }));
    setLoading(false);
  }, [profile, canReview]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const review = async (entryId: string, decision: 'approved' | 'rejected') => {
    if (savingId) return;
    const reason = reasons[entryId]?.trim() || '';
    if (decision === 'rejected' && !reason) {
      toast.error('Add a reason before returning an entry.');
      return;
    }
    setSavingId(entryId);
    const { error: reviewError } = await supabase.rpc('vacp_review_daily_entry', {
      p_entry_id: entryId,
      p_decision: decision,
      p_reason: reason,
    });
    if (reviewError) {
      console.error('Failed to review daily entry:', reviewError);
      toast.error(reviewError.message || 'Could not update approval.');
    } else {
      toast.success(decision === 'approved' ? 'Daily entry approved.' : 'Entry returned for correction.');
      await loadEntries();
    }
    setSavingId('');
  };

  if (!canReview) {
    return (
      <div>
        <TopBar title="Daily Approvals" subtitle="Supervisor access required" />
        <div className="p-6">
          <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
            <TriangleAlert className="mx-auto mb-3 text-slate-400" size={36} />
            <h1 className="font-semibold text-slate-900">Access restricted</h1>
            <p className="mt-1 text-sm text-slate-500">Only assigned supervisors, managers, administrators, and directors can review daily entries.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Daily Approvals" subtitle={`${entries.length} daily entries awaiting review`} />
      <main className="space-y-4 p-4 sm:p-6">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <FileCheck2 size={36} className="mx-auto mb-3 text-emerald-500" />
            <h2 className="font-semibold text-slate-900">All caught up</h2>
            <p className="mt-1 text-sm text-slate-500">No daily KPI entries are awaiting your review.</p>
          </div>
        ) : entries.map((entry) => (
          <article key={entry.id} className="overflow-hidden rounded-xl border bg-white">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-semibold text-slate-900">{entry.member.full_name}</h2>
                <p className="mt-1 text-sm text-slate-500">{entry.member.department || 'No department'} · {entry.member.role.replaceAll('_', ' ')}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-amber-100 text-amber-800">Pending approval</Badge>
                <p className="mt-2 text-sm text-slate-500">{new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="divide-y">
              {entry.items.map((item) => {
                const kpi = kpis[item.kpi_id];
                return (
                  <div key={item.kpi_id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="font-medium text-slate-800">{kpi?.title || 'Assigned KPI'}</p>
                      <p className="mt-1 text-sm text-slate-500">Target: {kpi?.target ?? '—'} {kpi?.unit || ''} · Reported: <span className="font-semibold text-slate-800">{item.number_value ?? '—'} {kpi?.unit || ''}</span></p>
                      {item.note && <p className="mt-1 text-sm text-slate-600">{item.note}</p>}
                    </div>
                    {item.proof_url ? (
                      <a href={item.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline">
                        Proof{ kpi?.proof_type ? ` · ${kpi.proof_type}` : '' } <ExternalLink size={14} />
                      </a>
                    ) : <span className="text-sm text-slate-400">No proof URL</span>}
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 border-t bg-slate-50 p-4">
              <label htmlFor={`reason-${entry.id}`} className="block text-xs font-medium text-slate-600">Rejection reason (required only when returning)</label>
              <Textarea id={`reason-${entry.id}`} rows={2} maxLength={500} placeholder="e.g. Proof link does not match the reported count" value={reasons[entry.id] || ''} onChange={(event) => setReasons({ ...reasons, [entry.id]: event.target.value })} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={savingId === entry.id} onClick={() => void review(entry.id, 'rejected')}>
                  <X size={15} className="mr-2" /> Return for correction
                </Button>
                <Button disabled={savingId === entry.id} onClick={() => void review(entry.id, 'approved')}>
                  <Check size={15} className="mr-2" /> {savingId === entry.id ? 'Saving...' : 'Approve'}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
