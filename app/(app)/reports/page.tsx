'use client';

import { useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { usePerformanceData } from '@/hooks/use-performance-data';
import { calculateAchievementPercent, monthKey, summarizePerformance } from '@/lib/performance';
import type { PerformanceEntry } from '@/lib/performance-types';
import { Download, Printer } from 'lucide-react';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function currentQuarter(): string {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

function quarterKey(month: string): string {
  const [year, value] = month.split('-').map(Number);
  return `${year}-Q${Math.floor((value - 1) / 3) + 1}`;
}

function reportingPeriod(date: string, mode: 'monthly' | 'quarterly'): string {
  return mode === 'monthly' ? monthKey(date) : quarterKey(monthKey(date));
}

function csvCell(value: string | number | null): string {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: (string | number | null)[][], period: string): void {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vacp-performance-${period}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { data, loading, error, reload } = usePerformanceData(12);
  const [periodMode, setPeriodMode] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const summary = useMemo(() => data ? summarizePerformance(data, new Date(), 12) : null, [data]);

  if (loading) {
    return (
      <div>
        <TopBar title="Performance reports" subtitle="Loading approved KPI data" />
        <SybellaLoadingState text="Loading reports" />
      </div>
    );
  }

  if (error || !data || !summary) {
    return (
      <div>
        <TopBar title="Performance reports" subtitle="Monthly, department and company summaries" />
        <main className="p-4 sm:p-6">
          <section role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800">
            <p>{error || 'Report data is unavailable.'}</p>
            <button type="button" onClick={() => void reload()} className="mt-3 rounded-md bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800">Retry</button>
          </section>
        </main>
      </div>
    );
  }

  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const availablePeriods = periodMode === 'monthly'
    ? summary.monthlyTrend.map((month) => month.key)
    : Array.from(new Set(summary.monthlyTrend.map((month) => quarterKey(month.key))));
  const activePeriod = availablePeriods.includes(selectedPeriod)
    ? selectedPeriod
    : periodMode === 'monthly' ? currentMonth() : currentQuarter();
  const entries = data.entries.filter((entry) => {
    if (reportingPeriod(entry.entry_date, periodMode) !== activePeriod) return false;
    if (selectedDepartment === 'all') return true;
    return peopleById.get(entry.user_id)?.department === selectedDepartment;
  });
  const entryIds = new Set(entries.map((entry) => entry.id));
  const entryItems = data.items.filter((item) => entryIds.has(item.entry_id));
  const approvedIds = new Set(entries.filter((entry) => entry.status === 'approved').map((entry) => entry.id));
  const approvedResults = summary.results.filter((result) =>
    entryIds.has(result.entry.id) && approvedIds.has(result.entry.id)
  );
  const approvedCount = entries.filter((entry) => entry.status === 'approved').length;
  const pendingCount = entries.filter((entry) => entry.status === 'pending').length;
  const averageAchievement = approvedResults.length
    ? approvedResults.reduce((sum, result) => sum + result.achievement, 0) / approvedResults.length
    : null;
  const exportRows: (string | number | null)[][] = [
    ['Reporting period', 'Department', 'Team member', 'Report date', 'Status', 'KPI', 'Actual', 'Target', 'Unit', 'Direction', 'Achievement %', 'Proof URL', 'Note'],
  ];
  entries.forEach((entry: PerformanceEntry) => {
    const person = peopleById.get(entry.user_id);
    const items = entryItems.filter((item) => item.entry_id === entry.id);
    if (!items.length) {
      exportRows.push([activePeriod, person?.department || 'Unassigned', person?.full_name || 'Team member', entry.entry_date, entry.status, null, null, null, null, null, null, null, null]);
    }
    items.forEach((item) => {
      const actual = item.number_value;
      const achievement = entry.status === 'approved' && actual !== null
        ? calculateAchievementPercent(actual, item.target_value, item.measurement_direction)
        : null;
      exportRows.push([
        activePeriod,
        person?.department || 'Unassigned',
        person?.full_name || 'Team member',
        entry.entry_date,
        entry.status,
        item.kpi_title,
        actual,
        item.target_value,
        item.unit,
        item.measurement_direction,
        achievement === null ? null : Math.round(achievement * 100) / 100,
        item.proof_url || null,
        item.note || null,
      ]);
    });
  });
  const departmentLabel = selectedDepartment === 'all' ? 'All accessible departments' : selectedDepartment;

  return (
    <div>
      <section id="shareable-report" aria-label="Printable performance report">
        <header className="share-report-header">
          <div>
            <p className="share-report-company">Sybella Systems Ltd</p>
            <p className="share-report-contact">Integrations &amp; Systems Engineering · Rulindo, Rwanda</p>
            <p className="share-report-contact">info@sybellasystems.co.rw · +250 723 776 020</p>
          </div>
          <p className="share-report-brand">VAC-P</p>
        </header>
        <div className="share-report-title">
          <h1>Performance report</h1>
          <p>{periodMode === 'monthly' ? 'Month' : 'Quarter'}: {activePeriod} <span>·</span> Department: {departmentLabel}</p>
          <p>Generated {new Date().toLocaleDateString()}</p>
        </div>
        <section className="share-report-summary" aria-label="Report summary">
          <div><span>Reports submitted</span><strong>{entries.length}</strong></div>
          <div><span>Approved</span><strong>{approvedCount}</strong></div>
          <div><span>Awaiting approval</span><strong>{pendingCount}</strong></div>
          <div><span>Average approved achievement</span><strong>{averageAchievement === null ? '—' : `${Math.round(averageAchievement)}%`}</strong></div>
        </section>
        <h2 className="share-report-section-title">Report details</h2>
        {entries.length === 0 ? (
          <p className="share-report-empty">No reports were recorded for this period and department.</p>
        ) : (
          <table className="share-report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team member</th>
                <th>Department</th>
                <th>KPI results</th>
                <th>Achievement</th>
                <th>Status</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const person = peopleById.get(entry.user_id);
                const items = entryItems.filter((item) => item.entry_id === entry.id);
                return (
                  <tr key={entry.id}>
                    <td>{entry.entry_date}</td>
                    <td>{person?.full_name || 'Team member'}</td>
                    <td>{person?.department || 'Unassigned'}</td>
                    <td>{items.length ? items.map((item) => `${item.kpi_title}: ${item.number_value ?? '—'} / ${item.target_value} ${item.unit}`).join('; ') : 'No KPI values'}</td>
                    <td>{entry.status === 'approved'
                      ? items.map((item) => {
                        const score = item.number_value === null ? null : calculateAchievementPercent(item.number_value, item.target_value, item.measurement_direction);
                        return `${item.kpi_title}: ${score === null ? '—' : `${Math.round(score)}%`}`;
                      }).join('; ') || '—'
                      : 'Counts after approval'}</td>
                    <td>{entry.status}</td>
                    <td>{items.map((item) => item.proof_url).filter(Boolean).join('; ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <footer className="share-report-footer">Sybella Systems Ltd · VAC-P · Confidential internal performance report</footer>
      </section>
      <div className="screen-report">
      <TopBar title="Performance reports" subtitle="Verified reporting-period summaries from VAC-P KPI records" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Reporting period</span>
              <select value={periodMode} onChange={(event) => {
                const nextMode = event.target.value as 'monthly' | 'quarterly';
                setPeriodMode(nextMode);
                setSelectedPeriod(nextMode === 'monthly' ? currentMonth() : currentQuarter());
              }} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">{periodMode === 'monthly' ? 'Month' : 'Quarter'}</span>
              <select value={activePeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                {availablePeriods.map((period) => <option key={period} value={period}>{period}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              <span className="mb-1 block">Department</span>
              <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="h-10 min-w-48 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="all">All accessible departments</option>
                {Array.from(new Set(data.people.map((person) => person.department).filter(Boolean))).sort().map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={() => downloadCsv(exportRows, activePeriod)} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800">
              <Download size={15} /> Export CSV
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Reports submitted', value: entries.length },
            { label: 'Approved', value: entries.filter((entry) => entry.status === 'approved').length },
            { label: 'Awaiting approval', value: entries.filter((entry) => entry.status === 'pending').length },
            { label: 'Average approved achievement', value: averageAchievement === null ? '—' : `${Math.round(averageAchievement)}%` },
          ].map((metric) => (
            <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-900">Report details</h2>
            <p className="mt-1 text-sm text-slate-500">Each result retains the KPI target and measurement direction captured when it was submitted.</p>
          </div>
          {entries.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No reports were recorded for this period and department.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Team member</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">KPI result</th><th className="px-4 py-3">Achievement</th><th className="px-4 py-3">Status</th></tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const person = peopleById.get(entry.user_id);
                    const items = entryItems.filter((item) => item.entry_id === entry.id);
                    return (
                      <tr key={entry.id} className="border-t border-slate-100 align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.entry_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{person?.full_name || 'Team member'}</td>
                        <td className="px-4 py-3 text-slate-600">{person?.department || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          {items.length ? items.map((item) => (
                            <p key={item.id} className="mb-1 last:mb-0 text-slate-700">{item.kpi_title}: {item.number_value ?? '—'} / {item.target_value} {item.unit}</p>
                          )) : <span className="text-slate-400">No KPI values</span>}
                        </td>
                        <td className="px-4 py-3">
                          {items.filter((item) => entry.status === 'approved' && item.number_value !== null).map((item) => {
                            const score = item.number_value === null ? null : calculateAchievementPercent(item.number_value, item.target_value, item.measurement_direction);
                            return <p key={item.id} className="mb-1 last:mb-0 text-slate-700">{item.kpi_title}: {score === null ? '—' : `${Math.round(score)}%`}</p>;
                          })}
                          {entry.status !== 'approved' && <span className="text-slate-400">Counts after approval</span>}
                        </td>
                        <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">{entry.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
}
