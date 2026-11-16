
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileWarning,
  RefreshCw,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';

import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Entry = {
  id: string;
  user_id: string;
  entry_date: string;
  submitted_at: string | null;
};

type Member = {
  id: string;
  full_name: string;
  department: string;
  role: string;
};

type Kpi = {
  id: string;
  title: string;
  unit: string;
  target: number;
  proof_type: string;
};

type Item = {
  entry_id: string;
  kpi_id: string;
  number_value: number | null;
  proof_url: string | null;
  note: string;
};

type ReviewCard = Entry & {
  member: Member;
  items: Item[];
};

const formatEntryDate = (date: string) => {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatSubmittedAt = (date: string | null) => {
  if (!date) return 'Submission time unavailable';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'Submission time unavailable';
  }

  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRole = (role: string) => {
  return role.replaceAll('_', ' ');
};

export default function DailyApprovalsPage() {
  const { profile } = useAuth();

  const canReview = ['admin', 'director', 'manager'].includes(
    profile?.role || ''
  );

  const [entries, setEntries] = useState<ReviewCard[]>([]);
  const [kpis, setKpis] = useState<Record<string, Kpi>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const loadEntries = useCallback(async (showLoading = true) => {
    if (!profile || !canReview) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    setError('');

    try {
      const { data: entryData, error: entryError } = await supabase
        .from('daily_entries')
        .select('id, user_id, entry_date, submitted_at')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (entryError) throw entryError;

      const pending = (entryData || []) as Entry[];

      if (pending.length === 0) {
        setEntries([]);
        setKpis({});
        setLoading(false);
        return;
      }

      const [memberResult, itemResult, kpiResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, department, role')
          .in(
            'id',
            Array.from(new Set(pending.map((item) => item.user_id)))
          ),

        supabase
          .from('daily_entry_items')
          .select('*')
          .in('entry_id', pending.map((item) => item.id)),

        supabase
          .from('daily_kpis')
          .select('id, title, unit, target, proof_type'),
      ]);

      const queryError =
        memberResult.error || itemResult.error || kpiResult.error;

      if (queryError) throw queryError;

      const memberMap = new Map(
        (memberResult.data || []).map((member) => [
          member.id,
          member as Member,
        ])
      );

      const itemsByEntry = new Map<string, Item[]>();

      ((itemResult.data || []) as Item[]).forEach((item) => {
        const existing = itemsByEntry.get(item.entry_id) || [];
        itemsByEntry.set(item.entry_id, [...existing, item]);
      });

      const kpiMap: Record<string, Kpi> = {};

      (kpiResult.data || []).forEach((item) => {
        kpiMap[item.id] = item as Kpi;
      });

      setKpis(kpiMap);

      setEntries(
        pending.flatMap((item) => {
          const member = memberMap.get(item.user_id);

          return member
            ? [
                {
                  ...item,
                  member,
                  items: itemsByEntry.get(item.id) || [],
                },
              ]
            : [];
        })
      );
    } catch (err) {
      console.error('Failed to load daily approvals:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Could not load pending daily entries.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [profile, canReview]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const review = async (
    entryId: string,
    decision: 'approved' | 'rejected'
  ) => {
    if (savingId) return;

    const reason = reasons[entryId]?.trim() || '';

    if (decision === 'rejected' && !reason) {
      toast.error('Add a reason before returning this entry.');
      return;
    }

    setSavingId(entryId);

    try {
      const { error: reviewError } = await supabase.rpc(
        'vacp_review_daily_entry',
        {
          p_entry_id: entryId,
          p_decision: decision,
          p_reason: reason,
        }
      );

      if (reviewError) throw reviewError;

      toast.success(
        decision === 'approved'
          ? 'Daily entry approved.'
          : 'Entry returned for correction.'
      );

      setReasons((current) => {
        const updated = { ...current };
        delete updated[entryId];
        return updated;
      });

      await loadEntries(false);
    } catch (err) {
      console.error('Failed to review daily entry:', err);

      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not update approval.'
      );
    } finally {
      setSavingId('');
    }
  };

  if (!canReview) {
    return (
      <div>
        <TopBar
          title="Daily Approvals"
          subtitle="Supervisor access required"
        />

        <main className="p-4 sm:p-6">
          <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              Access restricted
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              You do not have permission to review daily entries.
              Contact an administrator if you believe this is incorrect.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar
        title="Daily Approvals"
        subtitle="Review and manage submitted daily KPI reports"
      />

      <main className="space-y-6 p-4 sm:p-6">
        {/* Overview */}
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <ClipboardCheck className="h-6 w-6 text-blue-700" />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Review queue
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review submitted work and provide feedback where necessary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-24 rounded-xl bg-amber-50 px-4 py-2 text-center">
              <p className="text-2xl font-bold tabular-nums text-amber-700">
                {entries.length}
              </p>
              <p className="text-xs font-medium text-amber-700">
                Awaiting review
              </p>
            </div>

            <Button
              variant="outline"
              size="icon"
              title="Refresh approvals"
              disabled={loading || Boolean(savingId)}
              onClick={() => void loadEntries()}
            >
              <RefreshCw
                size={16}
                className={loading ? 'animate-spin' : ''}
              />
            </Button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Unable to load approvals
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadEntries()}
              disabled={loading}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-slate-500">
              Loading pending submissions...
            </p>
          </div>
        ) : entries.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">
              All caught up
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              There are currently no daily KPI entries awaiting your review.
              New submissions will appear here.
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={() => void loadEntries()}
            >
              <RefreshCw size={15} className="mr-2" />
              Refresh queue
            </Button>
          </div>
        ) : (
          /* Pending entries */
          <section className="space-y-5">
            {entries.map((entry) => {
              const isSaving = savingId === entry.id;
              const reason = reasons[entry.id] || '';
              const hasMissingProof = entry.items.some(
                (item) => !item.proof_url
              );

              return (
                <article
                  key={entry.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Member header */}
                  <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <UserRound className="h-5 w-5 text-slate-600" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900">
                          {entry.member.full_name}
                        </h2>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={13} />
                            {entry.member.department || 'No department'}
                          </span>

                          <span className="capitalize">
                            {formatRole(entry.member.role)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <Badge className="border border-amber-200 bg-amber-50 text-amber-800">
                        <Clock3 size={12} className="mr-1" />
                        Pending review
                      </Badge>

                      <div className="text-left sm:text-right">
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                          <CalendarDays size={14} />
                          {formatEntryDate(entry.entry_date)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Submitted {formatSubmittedAt(entry.submitted_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* KPI section */}
                  <div className="p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Reported KPI results
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Review the reported values and supporting evidence.
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {entry.items.length} {entry.items.length === 1 ? 'KPI' : 'KPIs'}
                      </span>
                    </div>

                    {entry.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                        <FileWarning className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                        <p className="text-sm font-medium text-slate-700">
                          No KPI details found
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          This entry has no associated KPI items.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {entry.items.map((item) => {
                          const kpi = kpis[item.kpi_id];

                          return (
                            <div
                              key={item.kpi_id}
                              className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
                            >
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-semibold text-slate-900">
                                    {kpi?.title || 'Assigned KPI'}
                                  </h4>

                                  {item.note && (
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                      {item.note}
                                    </p>
                                  )}
                                </div>

                                <div className="flex shrink-0 gap-2">
                                  <div className="min-w-24 rounded-lg bg-slate-50 px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      Target
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {kpi?.target ?? '—'}
                                      {kpi?.unit ? ` ${kpi.unit}` : ''}
                                    </p>
                                  </div>

                                  <div className="min-w-24 rounded-lg bg-blue-50 px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                                      Reported
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-blue-800">
                                      {item.number_value ?? '—'}
                                      {kpi?.unit ? ` ${kpi.unit}` : ''}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 border-t border-slate-100 pt-3">
                                {item.proof_url ? (
                                  <a
                                    href={item.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                                  >
                                    <FileCheck2 size={15} />
                                    View supporting proof
                                    {kpi?.proof_type && (
                                      <span className="font-normal text-blue-500">
                                        · {kpi.proof_type}
                                      </span>
                                    )}
                                    <ArrowUpRight size={13} />
                                  </a>
                                ) : (
                                  <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                    <FileWarning size={15} />
                                    No proof URL provided
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Review actions */}
                  <div className="border-t border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Review decision
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Approve the submission or return it to the employee for correction.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`reason-${entry.id}`}
                          className="text-xs font-medium text-slate-700"
                        >
                          Feedback / return reason
                        </label>

                        <span className="text-xs tabular-nums text-slate-400">
                          {reason.length}/500
                        </span>
                      </div>

                      <Textarea
                        id={`reason-${entry.id}`}
                        rows={2}
                        maxLength={500}
                        placeholder="Explain what needs to be corrected. Required when returning an entry."
                        value={reason}
                        disabled={Boolean(savingId)}
                        onChange={(event) =>
                          setReasons((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        className="resize-y border-slate-200 bg-white"
                      />
                    </div>

                    {hasMissingProof && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <p className="text-xs leading-5 text-amber-800">
                          At least one KPI has no proof URL. Check the supporting evidence before making your decision.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="outline"
                        disabled={Boolean(savingId)}
                        onClick={() => void review(entry.id, 'rejected')}
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        <X size={15} className="mr-2" />
                        Return for correction
                      </Button>

                      <Button
                        disabled={Boolean(savingId)}
                        onClick={() => void review(entry.id, 'approved')}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={15} className="mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check size={15} className="mr-2" />
                            Approve entry
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
