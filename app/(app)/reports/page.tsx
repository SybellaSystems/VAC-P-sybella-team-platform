
'use client';

import { useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { usePerformanceData } from '@/hooks/use-performance-data';
import {
  calculateAchievementPercent,
  monthKey,
  summarizePerformance,
} from '@/lib/performance';
import type { PerformanceEntry } from '@/lib/performance-types';
import { Download, Printer, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';

type PeriodMode = 'monthly' | 'quarterly';

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

function reportingPeriod(date: string, mode: PeriodMode): string {
  return mode === 'monthly' ? monthKey(date) : quarterKey(monthKey(date));
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeriod(period: string, mode: PeriodMode): string {
  if (mode === 'quarterly') {
    return period.replace('-', ' · ');
  }

  const [year, month] = period.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function csvCell(value: string | number | null): string {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv(
  rows: (string | number | null)[][],
  period: string,
  department: string
): void {
  const content = rows
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');

  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `vacp-performance-${period}-${department
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export default function ReportsPage() {
  const { data, loading, error, reload } = usePerformanceData(12);

  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const summary = useMemo(
    () => (data ? summarizePerformance(data, new Date(), 12) : null),
    [data]
  );

  if (loading) {
    return (
      <div>
        <TopBar
          title="Performance reports"
          subtitle="Loading approved KPI data"
        />
        <SybellaLoadingState text="Loading reports" />
      </div>
    );
  }

  if (error || !data || !summary) {
    return (
      <div>
        <TopBar
          title="Performance reports"
          subtitle="Monthly, department and company summaries"
        />

        <main className="p-4 sm:p-6">
          <section
            role="alert"
            className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800"
          >
            <p>{error || 'Report data is unavailable.'}</p>

            <button
              type="button"
              onClick={() => void reload()}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </section>
        </main>
      </div>
    );
  }

  const peopleById = new Map(
    data.people.map((person) => [person.id, person])
  );

  const availablePeriods =
    periodMode === 'monthly'
      ? summary.monthlyTrend.map((month) => month.key)
      : Array.from(
          new Set(
            summary.monthlyTrend.map((month) => quarterKey(month.key))
          )
        );

  const currentPeriod =
    periodMode === 'monthly' ? currentMonth() : currentQuarter();

  const periodOptions = Array.from(
    new Set([...availablePeriods, currentPeriod])
  ).sort((a, b) => b.localeCompare(a));

  const activePeriod = periodOptions.includes(selectedPeriod)
    ? selectedPeriod
    : currentPeriod;

  const departments = Array.from(
    new Set(
      data.people
        .map((person) => person.department)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const entries = data.entries.filter((entry) => {
    if (reportingPeriod(entry.entry_date, periodMode) !== activePeriod) {
      return false;
    }

    if (selectedDepartment === 'all') return true;

    return (
      peopleById.get(entry.user_id)?.department === selectedDepartment
    );
  });

  const entryIds = new Set(entries.map((entry) => entry.id));

  const entryItems = data.items.filter((item) =>
    entryIds.has(item.entry_id)
  );

  const itemsByEntry = new Map<string, typeof entryItems>();

  entryItems.forEach((item) => {
    const existing = itemsByEntry.get(item.entry_id) || [];
    itemsByEntry.set(item.entry_id, [...existing, item]);
  });

  const approvedIds = new Set(
    entries
      .filter((entry) => entry.status === 'approved')
      .map((entry) => entry.id)
  );

  const approvedResults = summary.results.filter(
    (result) =>
      entryIds.has(result.entry.id) &&
      approvedIds.has(result.entry.id)
  );

  const approvedCount = entries.filter(
    (entry) => entry.status === 'approved'
  ).length;

  const pendingCount = entries.filter(
    (entry) => entry.status === 'pending'
  ).length;

  const rejectedCount = entries.filter(
    (entry) => entry.status === 'rejected'
  ).length;

  const averageAchievement = approvedResults.length
    ? approvedResults.reduce(
        (sum, result) => sum + result.achievement,
        0
      ) / approvedResults.length
    : null;

  const departmentLabel =
    selectedDepartment === 'all'
      ? 'All accessible departments'
      : selectedDepartment;

  const reportTitle = formatPeriod(activePeriod, periodMode);

  const generatedAt = new Date().toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Each KPI gets its own row for easier reading and analysis.
  const exportRows: (string | number | null)[][] = [
    [
      'Reporting period',
      'Department',
      'Team member',
      'Report date',
      'Report status',
      'KPI',
      'Actual',
      'Target',
      'Unit',
      'Measurement direction',
      'Achievement (%)',
      'Proof URL',
      'Notes',
    ],
  ];

  entries.forEach((entry: PerformanceEntry) => {
    const person = peopleById.get(entry.user_id);
    const items = itemsByEntry.get(entry.id) || [];

    if (!items.length) {
      exportRows.push([
        activePeriod,
        person?.department || 'Unassigned',
        person?.full_name || 'Team member',
        entry.entry_date,
        entry.status,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }

    items.forEach((item) => {
      const achievement =
        entry.status === 'approved' && item.number_value !== null
          ? calculateAchievementPercent(
              item.number_value,
              item.target_value,
              item.measurement_direction
            )
          : null;

      exportRows.push([
        activePeriod,
        person?.department || 'Unassigned',
        person?.full_name || 'Team member',
        entry.entry_date,
        entry.status,
        item.kpi_title,
        item.number_value,
        item.target_value,
        item.unit,
        item.measurement_direction,
        achievement === null
          ? null
          : Math.round(achievement * 100) / 100,
        item.proof_url || null,
        item.note || null,
      ]);
    });
  });

  const reportItems = entries.flatMap((entry) => {
    const person = peopleById.get(entry.user_id);
    const items = itemsByEntry.get(entry.id) || [];

    if (!items.length) {
      return [
        {
          id: `${entry.id}-empty`,
          date: entry.entry_date,
          member: person?.full_name || 'Team member',
          department: person?.department || 'Unassigned',
          status: entry.status,
          kpi: 'No KPI values recorded',
          actual: null as number | null,
          target: null as number | null,
          unit: '',
          direction: '',
          achievement: null as number | null,
          proof: null as string | null,
          note: '',
        },
      ];
    }

    return items.map((item) => {
      const achievement =
        entry.status === 'approved' && item.number_value !== null
          ? calculateAchievementPercent(
              item.number_value,
              item.target_value,
              item.measurement_direction
            )
          : null;

      return {
        id: item.id,
        date: entry.entry_date,
        member: person?.full_name || 'Team member',
        department: person?.department || 'Unassigned',
        status: entry.status,
        kpi: item.kpi_title,
        actual: item.number_value,
        target: item.target_value,
        unit: item.unit || '',
        direction: item.measurement_direction || '',
        achievement,
        proof: item.proof_url || null,
        note: item.note || '',
      };
    });
  });

  const metrics = [
    {
      label: 'Reports submitted',
      value: entries.length,
      description: 'Total daily reports',
    },
    {
      label: 'Approved',
      value: approvedCount,
      description: 'Verified submissions',
    },
    {
      label: 'Awaiting approval',
      value: pendingCount,
      description: 'Pending supervisor review',
    },
    {
      label: 'Average achievement',
      value:
        averageAchievement === null
          ? '—'
          : `${Math.round(averageAchievement)}%`,
      description: 'Approved KPI results only',
    },
  ];

  return (
    <div>
      {/* Printable report document */}
      <section
        id="shareable-report"
        aria-label="Printable performance report"
        className="report-document"
      >
        <header className="report-header">
          <div>
            <p className="report-company">Sybella Systems Ltd</p>
            <p className="report-company-detail">
              Integration &amp; Platform Engineering
            </p>
            <p className="report-company-detail">
              Rulindo, Rwanda · sybellasystems.co.rw
            </p>
          </div>

          <div className="report-brand">
            <span>VAC-P</span>
            <small>Performance Management</small>
          </div>
        </header>

        <div className="report-heading">
          <div>
            <p className="report-eyebrow">INTERNAL MANAGEMENT REPORT</p>
            <h1>Performance Report</h1>
            <p className="report-subtitle">
              {periodMode === 'monthly' ? 'Monthly' : 'Quarterly'} performance
              summary
            </p>
          </div>

          <div className="report-period">
            <span>REPORTING PERIOD</span>
            <strong>{reportTitle}</strong>
          </div>
        </div>

        <div className="report-meta">
          <div>
            <span>Department</span>
            <strong>{departmentLabel}</strong>
          </div>
          <div>
            <span>Report coverage</span>
            <strong>{entries.length} daily submissions</strong>
          </div>
          <div>
            <span>Generated</span>
            <strong>{generatedAt}</strong>
          </div>
        </div>

        <section className="report-summary">
          <div>
            <span>Reports submitted</span>
            <strong>{entries.length}</strong>
          </div>
          <div>
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>
          <div>
            <span>Pending review</span>
            <strong>{pendingCount}</strong>
          </div>
          <div>
            <span>Rejected / returned</span>
            <strong>{rejectedCount}</strong>
          </div>
          <div>
            <span>Average achievement</span>
            <strong>
              {averageAchievement === null
                ? '—'
                : `${Math.round(averageAchievement)}%`}
            </strong>
          </div>
        </section>

        <div className="report-section-heading">
          <div>
            <h2>Detailed KPI performance</h2>
            <p>
              Actual results, assigned targets and approval status for each
              reported KPI.
            </p>
          </div>

          <span>{reportItems.length} KPI records</span>
        </div>

        {reportItems.length === 0 ? (
          <div className="report-empty">
            No performance records were found for this reporting period and
            department.
          </div>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Team member</th>
                <th>Department</th>
                <th>KPI</th>
                <th>Actual</th>
                <th>Target</th>
                <th>Direction</th>
                <th>Achievement</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>

            <tbody>
              {reportItems.map((item) => (
                <tr key={item.id}>
                  <td className="report-nowrap">
                    {formatDate(item.date)}
                  </td>
                  <td className="report-name">{item.member}</td>
                  <td>{item.department}</td>
                  <td className="report-kpi">{item.kpi}</td>
                  <td className="report-nowrap">
                    {item.actual ?? '—'}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td className="report-nowrap">
                    {item.target ?? '—'}
                    {item.unit ? ` ${item.unit}` : ''}
                  </td>
                  <td>{item.direction || '—'}</td>
                  <td className="report-nowrap">
                    {item.achievement === null
                      ? '—'
                      : `${item.achievement.toFixed(1)}%`}
                  </td>
                  <td>
                    <span
                      className={`report-status report-status-${item.status}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td>
                    {item.proof ? (
                      <a
                        href={item.proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="report-proof"
                      >
                        View evidence
                      </a>
                    ) : (
                      <span className="report-muted">Not provided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reportItems.some((item) => item.note) && (
          <section className="report-notes">
            <h2>Submission notes</h2>

            {reportItems
              .filter((item) => item.note)
              .map((item) => (
                <div key={`${item.id}-note`} className="report-note">
                  <strong>
                    {item.member} · {item.kpi}
                  </strong>
                  <p>{item.note}</p>
                </div>
              ))}
          </section>
        )}

        <footer className="report-footer">
          <div>
            <strong>Sybella Systems Ltd</strong>
            <span>VAC-P Performance Management</span>
          </div>
          <p>
            Confidential internal document · For authorized management use
          </p>
        </footer>
      </section>

      {/* Screen interface */}
      <div className="screen-report">
        <TopBar
          title="Performance reports"
          subtitle="Prepare, review and export verified performance reports"
        />

        <main className="space-y-5 p-4 sm:p-6">
          {/* Filters and export actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Report configuration
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the reporting period and department before generating
                your report.
              </p>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-wrap gap-3">
                <label className="text-xs font-medium text-slate-600">
                  <span className="mb-1.5 block">Reporting frequency</span>
                  <select
                    value={periodMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as PeriodMode;
                      setPeriodMode(nextMode);
                      setSelectedPeriod(
                        nextMode === 'monthly'
                          ? currentMonth()
                          : currentQuarter()
                      );
                    }}
                    className="h-10 min-w-36 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </label>

                <label className="text-xs font-medium text-slate-600">
                  <span className="mb-1.5 block">Reporting period</span>
                  <select
                    value={activePeriod}
                    onChange={(event) =>
                      setSelectedPeriod(event.target.value)
                    }
                    className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {periodOptions.map((period) => (
                      <option key={period} value={period}>
                        {formatPeriod(period, periodMode)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-medium text-slate-600">
                  <span className="mb-1.5 block">Department</span>
                  <select
                    value={selectedDepartment}
                    onChange={(event) =>
                      setSelectedDepartment(event.target.value)
                    }
                    className="h-10 min-w-48 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All accessible departments</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      exportRows,
                      activePeriod,
                      selectedDepartment
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <FileSpreadsheet size={16} />
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <Printer size={16} />
                  Print / Save PDF
                </button>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <article
                key={metric.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-500">
                    {metric.label}
                  </p>

                  <span
                    className={`h-2 w-2 rounded-full ${
                      index === 0
                        ? 'bg-blue-500'
                        : index === 1
                          ? 'bg-emerald-500'
                          : index === 2
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                    }`}
                  />
                </div>

                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                  {metric.value}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {metric.description}
                </p>
              </article>
            ))}
          </section>

          {/* Preview */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-blue-700" />
                  <h2 className="font-semibold text-slate-900">
                    Report preview
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {reportTitle} · {departmentLabel}
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {reportItems.length} KPI records
              </span>
            </div>

            {reportItems.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                <h3 className="font-medium text-slate-800">
                  No performance records
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No reports were recorded for this period and department.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Team member</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">KPI</th>
                      <th className="px-4 py-3">Actual / Target</th>
                      <th className="px-4 py-3">Achievement</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Evidence</th>
                    </tr>
                  </thead>

                  <tbody>
                    {reportItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {formatDate(item.date)}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.member}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {item.department}
                        </td>

                        <td className="max-w-52 px-4 py-3 font-medium text-slate-700">
                          {item.kpi}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {item.actual ?? '—'} / {item.target ?? '—'}{' '}
                          {item.unit}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-700">
                          {item.achievement === null
                            ? '—'
                            : `${item.achievement.toFixed(1)}%`}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">
                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {item.proof ? (
                            <a
                              href={item.proof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
                            >
                              View <Download size={12} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              None
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs leading-5 text-slate-400">
            Performance achievement is calculated only for approved KPI
            results. Pending and returned submissions are included in the
            report for transparency but are excluded from the average
            achievement calculation.
          </p>
        </main>
      </div>

      {/* Dedicated print styling */}
      <style>{`
        .report-document {
          display: none;
          color: #172033;
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 15px;
          border-bottom: 2px solid #1e3a5f;
        }

        .report-company {
          margin: 0;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #142b49;
        }

        .report-company-detail {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 9px;
        }

        .report-brand {
          text-align: right;
          color: #1d4ed8;
        }

        .report-brand span {
          display: block;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .report-brand small {
          color: #64748b;
          font-size: 8px;
        }

        .report-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          margin: 22px 0 14px;
        }

        .report-eyebrow {
          margin: 0 0 5px;
          color: #64748b;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 1.3px;
        }

        .report-heading h1 {
          margin: 0;
          color: #142b49;
          font-size: 25px;
          font-weight: 700;
        }

        .report-subtitle {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .report-period {
          min-width: 145px;
          padding: 10px 13px;
          border: 1px solid #dbe3ed;
          border-radius: 5px;
          text-align: right;
        }

        .report-period span,
        .report-meta span {
          display: block;
          margin-bottom: 4px;
          color: #64748b;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        .report-period strong {
          color: #142b49;
          font-size: 13px;
        }

        .report-meta {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 10px;
          padding: 11px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 5px;
          background: #f8fafc;
        }

        .report-meta strong {
          font-size: 10px;
          font-weight: 600;
          color: #26364b;
        }

        .report-summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 9px;
          margin: 14px 0 22px;
        }

        .report-summary > div {
          padding: 11px;
          border: 1px solid #dfe6ef;
          border-radius: 5px;
        }

        .report-summary span {
          display: block;
          min-height: 22px;
          color: #64748b;
          font-size: 8px;
        }

        .report-summary strong {
          display: block;
          margin-top: 3px;
          color: #142b49;
          font-size: 19px;
          font-weight: 700;
        }

        .report-section-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 9px;
        }

        .report-section-heading h2,
        .report-notes h2 {
          margin: 0;
          color: #142b49;
          font-size: 13px;
          font-weight: 700;
        }

        .report-section-heading p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 9px;
        }

        .report-section-heading > span {
          color: #64748b;
          font-size: 9px;
          white-space: nowrap;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 8px;
        }

        .report-table th {
          padding: 8px 6px;
          background: #edf2f7;
          border: 1px solid #d9e1eb;
          color: #334155;
          text-align: left;
          font-size: 7.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .25px;
        }

        .report-table td {
          padding: 7px 6px;
          border: 1px solid #e2e8f0;
          color: #334155;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .report-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .report-nowrap {
          white-space: nowrap;
        }

        .report-name {
          min-width: 100px;
          font-weight: 600;
          color: #172033 !important;
        }

        .report-kpi {
          min-width: 125px;
          font-weight: 600;
        }

        .report-status {
          display: inline-block;
          padding: 3px 6px;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
          color: #475569;
          font-size: 7px;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .report-status-approved {
          border-color: #a7d9bb;
          background: #effaf3;
          color: #166534;
        }

        .report-status-pending {
          border-color: #f3d38a;
          background: #fffbeb;
          color: #92400e;
        }

        .report-status-rejected {
          border-color: #fecaca;
          background: #fef2f2;
          color: #991b1b;
        }

        .report-proof {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .report-muted {
          color: #94a3b8;
        }

        .report-empty {
          padding: 30px;
          border: 1px dashed #cbd5e1;
          color: #64748b;
          text-align: center;
        }

        .report-notes {
          margin-top: 20px;
          break-inside: avoid;
        }

        .report-note {
          margin-top: 8px;
          padding: 8px 10px;
          border-left: 2px solid #94a3b8;
          background: #f8fafc;
        }

        .report-note strong {
          font-size: 9px;
          color: #334155;
        }

        .report-note p {
          margin: 4px 0 0;
          color: #475569;
          font-size: 9px;
          white-space: pre-wrap;
        }

        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 15px;
          margin-top: 22px;
          padding-top: 10px;
          border-top: 1px solid #cbd5e1;
          color: #64748b;
          font-size: 8px;
        }

        .report-footer strong,
        .report-footer span {
          display: block;
        }

        .report-footer strong {
          margin-bottom: 3px;
          color: #334155;
        }

        .report-footer p {
          margin: 0;
          text-align: right;
        }

        @page {
          size: A4 landscape;
          margin: 12mm;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #shareable-report,
          #shareable-report * {
            visibility: visible !important;
          }

          #shareable-report {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .screen-report {
            display: none !important;
          }

          .report-table {
            width: 100% !important;
          }

          .report-table thead {
            display: table-header-group;
          }

          .report-table tfoot {
            display: table-footer-group;
          }

          .report-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-header,
          .report-meta,
          .report-summary,
          .report-section-heading {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .report-notes,
          .report-note {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          a {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
        }
      `}</style>
    </div>
  );
}
