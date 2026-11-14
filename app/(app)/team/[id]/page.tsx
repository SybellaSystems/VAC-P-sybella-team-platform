'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@sybellasystems/ui';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';

type Kpi = { id: string; user_id: string; title: string; unit: string; target: number; is_active: boolean };
type Entry = { id: string; user_id: string; entry_date: string; status: string };
type Item = { entry_id: string; kpi_id: string; kpi_title: string; unit: string; target_value: number; number_value: number | null };
type HistoryRow = Record<string, unknown> & { date: string; kpi: string; value: string; status: string };

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TeamMemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { profile: viewer } = useAuth();
  const [member, setMember] = useState<Profile | null>(null);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!viewer || !id) return;
    setLoading(true);
    setError('');
    const { data: subjectData, error: subjectError } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (subjectError || !subjectData) {
      setError(subjectError?.message || 'This team profile is not available.');
      setLoading(false);
      return;
    }
    const subject = subjectData as Profile;
    const isAdmin = ['admin', 'director'].includes(viewer.role);
    const sameDepartment = !!viewer.department_id && viewer.department_id === subject.department_id;
    let partnerAccess = false;
    if (viewer.role === 'partner' && subject.department_id) {
      const { data: grant } = await supabase.from('partner_department_access').select('department_id')
        .eq('partner_id', viewer.id).eq('department_id', subject.department_id).maybeSingle();
      partnerAccess = !!grant;
    }
    if (subject.id !== viewer.id && !isAdmin && !sameDepartment && !partnerAccess) {
      setError('You do not have access to this team member.');
      setLoading(false);
      return;
    }

    const last30 = new Date();
    last30.setDate(last30.getDate() - 29);
    const [kpiResult, entryResult, teamResult] = await Promise.all([
      supabase.from('daily_kpis').select('id,user_id,title,unit,target,is_active').eq('user_id', subject.id).order('created_at'),
      supabase.from('daily_entries').select('id,user_id,entry_date,status').eq('user_id', subject.id).gte('entry_date', localDateString(last30)).order('entry_date'),
      subject.department_id
        ? supabase.from('profiles').select('id').eq('department_id', subject.department_id).eq('is_active', true)
        : Promise.resolve({ data: [{ id: subject.id }], error: null }),
    ]);
    const queryError = kpiResult.error || entryResult.error || teamResult.error;
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    const currentEntries = (entryResult.data || []) as Entry[];
    const teamMemberIds = ((teamResult.data || []).map((item) => item.id) as string[]);
    const relatedEntries = teamMemberIds.length
      ? await supabase.from('daily_entries').select('id,user_id,entry_date,status')
        .in('user_id', teamMemberIds).gte('entry_date', localDateString(last30)).eq('status', 'approved')
      : { data: [], error: null };
    const allIds = Array.from(new Set([...currentEntries.map((entry) => entry.id), ...((relatedEntries.data || []) as Entry[]).map((entry) => entry.id)]));
    const itemResult = allIds.length
      ? await supabase.from('daily_entry_items').select('entry_id,kpi_id,kpi_title,unit,target_value,number_value').in('entry_id', allIds)
      : { data: [], error: null };
    if (relatedEntries.error || itemResult.error) {
      setError(relatedEntries.error?.message || itemResult.error?.message || 'Unable to load KPI history.');
    } else {
      setMember(subject);
      setKpis((kpiResult.data || []) as Kpi[]);
      setEntries(currentEntries);
      setItems((itemResult.data || []) as Item[]);
      setTeamIds(teamMemberIds);
    }
    setLoading(false);
  }, [viewer, id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const ownEntries = entries.filter((entry) => entry.status === 'approved');
  const ownItems = items.filter((item) => ownEntries.some((entry) => entry.id === item.entry_id));
  const approvedDays = new Set(ownEntries.map((entry) => entry.entry_date)).size;
  const consistency = Math.round((approvedDays / 30) * 100);
  const kpiRows = useMemo(() => kpis.map((kpi) => {
    const personal = ownItems.filter((item) => item.kpi_id === kpi.id && item.number_value !== null);
    const total = personal.reduce((sum, item) => sum + Number(item.number_value), 0);
    const average = personal.length ? total / personal.length : 0;
    const cohortItems = items.filter((item) => item.kpi_title === kpi.title && item.number_value !== null);
    const cohortAverage = cohortItems.length ? cohortItems.reduce((sum, item) => sum + Number(item.number_value), 0) / cohortItems.length : 0;
    return {
      title: kpi.title,
      unit: kpi.unit,
      target: kpi.target,
      average: Number(average.toFixed(2)),
      cohortAverage: Number(cohortAverage.toFixed(2)),
      days: personal.length,
    };
  }), [kpis, ownItems, items]);

  const trend = useMemo(() => {
    const byDate: Record<string, number> = {};
    ownItems.forEach((item) => {
      const date = entries.find((entry) => entry.id === item.entry_id)?.entry_date;
      if (date && item.number_value !== null) byDate[date] = (byDate[date] || 0) + Number(item.number_value);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date: date.slice(5), value }));
  }, [entries, ownItems]);

  const historyRows: HistoryRow[] = items.filter((item) => ownEntries.some((entry) => entry.id === item.entry_id)).map((item) => ({
    date: entries.find((entry) => entry.id === item.entry_id)?.entry_date || '',
    kpi: item.kpi_title,
    value: `${item.number_value ?? '—'} ${item.unit}`,
    status: 'Approved',
  }));
  const historyColumns: DataTableColumn<HistoryRow>[] = [
    { key: 'date', header: 'Date', sortable: true },
    { key: 'kpi', header: 'KPI', sortable: true },
    { key: 'value', header: 'Reported value' },
    { key: 'status', header: 'Review status' },
  ];

  if (loading) return <div><TopBar title="Team profile" subtitle="Loading performance history" /><SybellaLoadingState text="Loading team profile" /></div>;
  if (!member || error) return <div><TopBar title="Team profile" subtitle="Profile access" /><p role="alert" className="m-6 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">{error || 'This profile is not available.'}</p></div>;

  return (
    <div>
      <TopBar title={member.full_name} subtitle={`${member.title || member.role.replaceAll('_', ' ')} · ${member.department || 'Department not assigned'}`} />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Approved reporting days · 30 days</p><p className="mt-2 text-2xl font-bold text-slate-900">{approvedDays}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Reporting consistency</p><p className="mt-2 text-2xl font-bold text-slate-900">{consistency}%</p><p className="mt-1 text-xs text-slate-500">Based on approved report days in the last 30 days.</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Department peers</p><p className="mt-2 text-2xl font-bold text-slate-900">{teamIds.length}</p><p className="mt-1 text-xs text-slate-500">Comparison is limited to the same KPI and department.</p></div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold text-slate-900">Progress over time</h2>
            <p className="mt-1 text-xs text-slate-500">Daily approved KPI totals over the last 30 days.</p>
            <div className="mt-4 h-64" role="img" aria-label="Approved KPI totals over time">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-white">
            <div className="border-b p-5"><h2 className="font-semibold text-slate-900">KPI progress &amp; department comparison</h2><p className="mt-1 text-xs text-slate-500">Averages are calculated from approved entries only.</p></div>
            <div className="divide-y">
              {kpiRows.map((row) => <div key={row.title} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4"><div><p className="font-medium text-slate-800">{row.title}</p><p className="mt-1 text-xs text-slate-500">Target {row.target} {row.unit} · Personal avg {row.average} · Department avg {row.cohortAverage}</p></div><span className="self-center text-xs text-slate-500">{row.days} days</span></div>)}
              {kpiRows.length === 0 && <p className="p-6 text-sm text-slate-500">No KPI assignments yet.</p>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b p-5"><h2 className="font-semibold text-slate-900">Approved report history</h2><p className="mt-1 text-xs text-slate-500">Proof and approval history is visible only to authorized colleagues.</p></div>
          <DataTable columns={historyColumns} data={historyRows} searchable sortable pagination pageSize={10} bordered size="sm" ariaLabel={`Approved KPI history for ${member.full_name}`} emptyMessage="No approved KPI history in the selected period." />
        </section>
      </main>
    </div>
  );
}
