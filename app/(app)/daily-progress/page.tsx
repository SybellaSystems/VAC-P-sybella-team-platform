
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Save,
  Send,
  TriangleAlert,
  AlertCircle,
} from 'lucide-react';

type DailyKpi = {
  id: string;
  title: string;
  unit: string;
  target: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  proof_required: boolean;
  proof_type: string;
  active_from: string;
  active_until: string | null;
};

type DailyEntry = {
  id: string;
  entry_date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  rejection_reason: string | null;
};

type DailyEntryItem = {
  entry_id: string;
  kpi_id: string;
  kpi_title: string;
  unit: string;
  target_value: number;
  proof_required: boolean;
  proof_type: string;
  number_value: number | null;
  proof_url: string | null;
  note: string;
};

type EntryFormValue = {
  value: string;
  proof_url: string;
  note: string;
};

type HistoryEntry = DailyEntry & { items: DailyEntryItem[] };

type KpiValidationErrors = {
  value?: string;
  proof_url?: string;
};

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

const statusStyles: Record<DailyEntry['status'], string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function DailyProgressPage() {
  const { profile } = useAuth();

  const today = useMemo(() => localDateString(new Date()), []);

  const [kpis, setKpis] = useState<DailyKpi[]>([]);
  const [entry, setEntry] = useState<DailyEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [values, setValues] = useState<Record<string, EntryFormValue>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, KpiValidationErrors>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    setLoadError('');

    try {
      const historyStart = new Date();
      historyStart.setDate(historyStart.getDate() - 29);

      const [
        kpiResult,
        entryResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from('daily_kpis')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .lte('active_from', today)
          .order('created_at'),

        supabase
          .from('daily_entries')
          .select('*')
          .eq('user_id', profile.id)
          .eq('entry_date', today)
          .maybeSingle(),

        supabase
          .from('daily_entries')
          .select('*')
          .eq('user_id', profile.id)
          .gte('entry_date', localDateString(historyStart))
          .order('entry_date', { ascending: false }),
      ]);

      if (kpiResult.error) throw kpiResult.error;
      if (entryResult.error) throw entryResult.error;
      if (historyResult.error) throw historyResult.error;

      const activeKpis = ((kpiResult.data || []) as DailyKpi[]).filter(
        (kpi) => !kpi.active_until || kpi.active_until >= today
      );

      const currentEntry = (entryResult.data as DailyEntry | null) || null;
      const entries = (historyResult.data || []) as DailyEntry[];

      const entryIds = entries.map((item) => item.id);

      const itemResult = entryIds.length
        ? await supabase
            .from('daily_entry_items')
            .select('*')
            .in('entry_id', entryIds)
        : { data: [], error: null };

      if (itemResult.error) throw itemResult.error;

      const allItems = (itemResult.data || []) as DailyEntryItem[];

      const itemsByEntry = new Map<string, DailyEntryItem[]>();

      allItems.forEach((item) => {
        itemsByEntry.set(item.entry_id, [
          ...(itemsByEntry.get(item.entry_id) || []),
          item,
        ]);
      });

      setKpis(activeKpis);
      setEntry(currentEntry);

      setHistory(
        entries.map((item) => ({
          ...item,
          items: itemsByEntry.get(item.id) || [],
        }))
      );

      const currentItems = currentEntry
        ? allItems.filter((item) => item.entry_id === currentEntry.id)
        : [];

      const initialValues: Record<string, EntryFormValue> = {};

      activeKpis.forEach((kpi) => {
        const saved = currentItems.find(
          (item) => item.kpi_id === kpi.id
        );

        initialValues[kpi.id] = {
          value:
            saved?.number_value == null
              ? ''
              : String(saved.number_value),
          proof_url: saved?.proof_url || '',
          note: saved?.note || '',
        };
      });

      setValues(initialValues);
      setValidationErrors({});
    } catch (error) {
      console.error('Failed to load daily KPI progress:', error);

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not load your daily KPIs.'
      );
    } finally {
      setLoading(false);
    }
  }, [profile, today]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const editable =
    !entry ||
    entry.status === 'draft' ||
    entry.status === 'rejected';

  const approvedLastSevenDays = history.filter((item) => {
    const daysAgo = Math.floor(
      (
        new Date(`${today}T00:00:00`).getTime() -
        new Date(`${item.entry_date}T00:00:00`).getTime()
      ) / 86400000
    );

    return (
      item.status === 'approved' &&
      daysAgo >= 0 &&
      daysAgo < 7
    );
  }).length;

  const setKpiValue = (
    kpiId: string,
    field: keyof EntryFormValue,
    value: string
  ) => {
    setValues((current) => ({
      ...current,
      [kpiId]: {
        ...(current[kpiId] || {
          value: '',
          proof_url: '',
          note: '',
        }),
        [field]: value,
      },
    }));

    // Clear the validation message for the field being edited.
    setValidationErrors((current) => {
      const existing = current[kpiId];

      if (!existing || !existing[field as keyof KpiValidationErrors]) {
        return current;
      }

      const updated = { ...existing };
      delete updated[field as keyof KpiValidationErrors];

      const next = { ...current };

      if (Object.keys(updated).length === 0) {
        delete next[kpiId];
      } else {
        next[kpiId] = updated;
      }

      return next;
    });
  };

  const saveEntry = async (status: 'draft' | 'pending') => {
    if (!profile || !editable || saving) return;

    const items = kpis.map((kpi) => ({
      kpi_id: kpi.id,
      value:
        values[kpi.id]?.value === ''
          ? null
          : Number(values[kpi.id]?.value),
      proof_url: values[kpi.id]?.proof_url.trim() || null,
      note: values[kpi.id]?.note || '',
    }));

    if (
      items.some(
        (item) =>
          item.value !== null &&
          (!Number.isFinite(item.value) || item.value < 0)
      )
    ) {
      toast.error('KPI values must be zero or greater.');
      return;
    }

    if (items.some((item) => item.note.length > 140)) {
      toast.error('Notes must be 140 characters or fewer.');
      return;
    }

    if (status === 'pending') {
      const errors: Record<string, KpiValidationErrors> = {};

      kpis.forEach((kpi) => {
        const formValue = values[kpi.id];

        const value =
          formValue?.value === '' || formValue?.value == null
            ? null
            : Number(formValue.value);

        const proof = formValue?.proof_url.trim() || '';

        const kpiErrors: KpiValidationErrors = {};

        if (value === null) {
          kpiErrors.value = 'Enter your result for this KPI.';
        }

        if (kpi.proof_required && !proof) {
          kpiErrors.proof_url = 'This proof link is required.';
        } else if (
          kpi.proof_required &&
          !isValidHttpUrl(proof)
        ) {
          kpiErrors.proof_url =
            'Enter a valid link beginning with https:// or http://.';
        }

        if (Object.keys(kpiErrors).length > 0) {
          errors[kpi.id] = kpiErrors;
        }
      });

      setValidationErrors(errors);

      if (Object.keys(errors).length > 0) {
        const affectedKpis = kpis
          .filter((kpi) => errors[kpi.id])
          .map((kpi) => kpi.title);

        const missingProofCount = Object.values(errors).filter(
          (error) => error.proof_url
        ).length;

        const missingValueCount = Object.values(errors).filter(
          (error) => error.value
        ).length;

        const problems: string[] = [];

        if (missingValueCount > 0) {
          problems.push(
            `${missingValueCount} KPI result(s) missing`
          );
        }

        if (missingProofCount > 0) {
          problems.push(
            `${missingProofCount} required proof link(s) missing or invalid`
          );
        }

        toast.error(
          `Submission blocked: ${problems.join(' and ')}. Check the highlighted KPIs.`
        );

        console.warn('Daily progress submission validation:', {
          affectedKpis,
          errors,
        });

        return;
      }
    }

    setSaving(true);

    try {
      const { error } = await supabase.rpc(
        'vacp_save_daily_entry',
        {
          p_entry_date: today,
          p_status: status,
          p_items: items,
        }
      );

      if (error) {
        console.error('Failed to save daily KPI entry:', error);
        toast.error(error.message || 'Could not save your daily entry.');
        return;
      }

      setValidationErrors({});

      toast.success(
        status === 'pending'
          ? 'Daily entry submitted for approval.'
          : 'Draft saved.'
      );

      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar
          title="My Daily Progress"
          subtitle="Loading your assigned KPIs..."
        />

        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  const validationCount = Object.keys(validationErrors).length;

  return (
    <div>
      <TopBar
        title="My Daily Progress"
        subtitle={`${profile?.full_name || 'Your'} · ${
          profile?.department || 'Department not set'
        }`}
      />

      <main className="space-y-6 p-4 sm:p-6">
        {loadError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">
                Unable to load daily progress
              </p>

              <p className="mt-1">{loadError}</p>

              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void loadData()}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">Today</p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {new Date(`${today}T12:00:00`).toLocaleDateString(
                undefined,
                {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }
              )}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">Assigned KPIs</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {kpis.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-slate-500">
              Approved entries · last 7 days
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {approvedLastSevenDays}
            </p>
          </div>
        </section>

        <section className="rounded-xl border bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Daily KPI Tracker
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Record your daily results and provide proof where required.
                All required information must be completed before submission.
              </p>
            </div>

            {entry && (
              <Badge className={statusStyles[entry.status]}>
                {entry.status === 'pending' && (
                  <Clock3 size={13} className="mr-1" />
                )}

                {entry.status === 'approved' && (
                  <CheckCircle2 size={13} className="mr-1" />
                )}

                {entry.status[0].toUpperCase() +
                  entry.status.slice(1)}
              </Badge>
            )}
          </div>

          {entry?.status === 'rejected' &&
            entry.rejection_reason && (
              <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <span className="font-semibold">
                  Returned for correction:
                </span>{' '}
                {entry.rejection_reason}
              </div>
            )}

          {validationCount > 0 && editable && (
            <div
              role="alert"
              className="mx-5 mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-semibold">
                    Your submission is incomplete
                  </p>

                  <p className="mt-1">
                    Please correct the highlighted fields below.
                    Every KPI needs a result, and every KPI marked
                    as requiring proof needs a valid proof link.
                  </p>

                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {kpis.map((kpi) => {
                      const errors = validationErrors[kpi.id];

                      if (!errors) return null;

                      return (
                        <li key={kpi.id}>
                          <span className="font-medium">
                            {kpi.title}:
                          </span>{' '}
                          {[
                            errors.value ? 'result missing' : null,
                            errors.proof_url
                              ? 'proof link missing or invalid'
                              : null,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {kpis.length === 0 ? (
            <div className="p-10 text-center">
              <FileCheck2
                className="mx-auto mb-3 text-slate-300"
                size={34}
              />

              <p className="font-semibold text-slate-800">
                No KPIs assigned for today
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Your administrator or director can assign your daily
                measures in Set KPIs.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {kpis.map((kpi, index) => {
                const errors = validationErrors[kpi.id];

                return (
                  <article
                    key={kpi.id}
                    className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_160px]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          KPI {index + 1}
                        </span>

                        <h3 className="font-semibold text-slate-900">
                          {kpi.title}
                        </h3>
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        Target:{' '}
                        <span className="font-medium text-slate-700">
                          {kpi.target} {kpi.unit}
                        </span>{' '}
                        / {kpi.frequency}
                      </p>

                      <div className="mt-2">
                        {kpi.proof_required ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            Proof required: {kpi.proof_type}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600">
                            Proof optional
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`proof-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Proof URL{' '}
                            {kpi.proof_required
                              ? '(required)'
                              : '(optional)'}
                          </label>

                          <Input
                            id={`proof-${kpi.id}`}
                            type="url"
                            placeholder="https://..."
                            value={values[kpi.id]?.proof_url || ''}
                            disabled={!editable}
                            aria-invalid={Boolean(errors?.proof_url)}
                            className={
                              errors?.proof_url
                                ? 'border-red-500 focus-visible:ring-red-500'
                                : ''
                            }
                            onChange={(event) =>
                              setKpiValue(
                                kpi.id,
                                'proof_url',
                                event.target.value
                              )
                            }
                          />

                          {errors?.proof_url && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                              <AlertCircle
                                size={13}
                                className="mt-0.5 shrink-0"
                              />
                              {errors.proof_url}
                            </p>
                          )}

                          {!errors?.proof_url &&
                            kpi.proof_required && (
                              <p className="mt-1 text-xs text-slate-500">
                                Add a link to the document, report,
                                screenshot, or other required evidence.
                              </p>
                            )}
                        </div>

                        <div>
                          <label
                            htmlFor={`note-${kpi.id}`}
                            className="mb-1 block text-xs font-medium text-slate-600"
                          >
                            Note (optional, max 140 characters)
                          </label>

                          <Textarea
                            id={`note-${kpi.id}`}
                            rows={1}
                            maxLength={140}
                            value={values[kpi.id]?.note || ''}
                            disabled={!editable}
                            onChange={(event) =>
                              setKpiValue(
                                kpi.id,
                                'note',
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`value-${kpi.id}`}
                        className="mb-1 block text-xs font-medium text-slate-600"
                      >
                        Today ({kpi.unit}) *
                      </label>

                      <Input
                        id={`value-${kpi.id}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter result"
                        value={values[kpi.id]?.value || ''}
                        disabled={!editable}
                        aria-invalid={Boolean(errors?.value)}
                        className={
                          errors?.value
                            ? 'border-red-500 focus-visible:ring-red-500'
                            : ''
                        }
                        onChange={(event) =>
                          setKpiValue(
                            kpi.id,
                            'value',
                            event.target.value
                          )
                        }
                      />

                      {errors?.value && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                          <AlertCircle
                            size={13}
                            className="mt-0.5 shrink-0"
                          />
                          {errors.value}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {editable && kpis.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 p-4">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => void saveEntry('draft')}
              >
                <Save size={15} className="mr-2" />
                Save Draft
              </Button>

              <Button
                disabled={saving}
                onClick={() => void saveEntry('pending')}
              >
                <Send size={15} className="mr-2" />
                {saving ? 'Saving...' : 'Submit for Approval'}
              </Button>
            </div>
          )}

          {!editable && (
            <div className="flex items-center gap-2 border-t bg-slate-50 p-4 text-sm text-slate-600">
              {entry?.status === 'approved' ? (
                <CheckCircle2
                  size={16}
                  className="text-emerald-600"
                />
              ) : (
                <Clock3
                  size={16}
                  className="text-amber-600"
                />
              )}

              {entry?.status === 'approved'
                ? 'Approved entries are locked.'
                : 'Submitted and awaiting approval. This entry is read-only.'}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Daily Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your entries and their review status for the last 30 days.
            </p>
          </div>

          {history.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              No daily entries yet.
            </p>
          ) : (
            <div className="divide-y">
              {history.map((item) => (
                <details
                  key={item.id}
                  className="group px-5 py-4"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">
                      {new Date(
                        `${item.entry_date}T12:00:00`
                      ).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>

                    <Badge className={statusStyles[item.status]}>
                      {item.status[0].toUpperCase() +
                        item.status.slice(1)}
                    </Badge>
                  </summary>

                  <div className="mt-3 space-y-2 border-t pt-3">
                    {item.items.map((dailyItem) => (
                      <div
                        key={dailyItem.kpi_id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-slate-600">
                          {dailyItem.kpi_title}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {dailyItem.number_value ?? '—'}{' '}
                          {dailyItem.unit}
                        </span>

                        {dailyItem.proof_url && (
                          <a
                            href={dailyItem.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            Proof <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}

                    {item.rejection_reason && (
                      <p className="text-sm text-red-700">
                        Reason: {item.rejection_reason}
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
