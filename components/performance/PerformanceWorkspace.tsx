'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { usePerformanceData } from '@/hooks/use-performance-data';
import { monthKey, summarizePerformance } from '@/lib/performance';
import { ArrowDownRight, ArrowUpRight, BarChart3, ClipboardCheck, Target, Users } from 'lucide-react';

function percentage(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

function reportStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function PerformanceWorkspace({ detailed = false }: { detailed?: boolean }) {
  const { data, loading, error, reload } = usePerformanceData(6);
  const summary = useMemo(() => data ? summarizePerformance(data) : null, [data]);

  if (loading) {
    return (
      <div>
        <TopBar title={detailed ? 'KPIs & Analytics' : 'Overview'} subtitle="Loading verified performance data" />
        <SybellaLoadingState text="Loading performance" />
      </div>
    );
  }

  if (error || !data || !summary) {
    return (
      <div>
        <TopBar title={detailed ? 'KPIs & Analytics' : 'Overview'} subtitle="Company performance from approved KPI records" />
        <main className="p-4 sm:p-6">
          <section role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800">
            <p>{error || 'Performance data is unavailable.'}</p>
            <button type="button" onClick={() => void reload()} className="mt-3 rounded-md bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800">Retry</button>
          </section>
        </main>
      </div>
    );
  }

  const activeDate = new Date();
  const currentMonth = `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthResults = summary.results.filter((result) => monthKey(result.entry.entry_date) === currentMonth);
  const belowTargetKpis = new Map<string, { title: string; achievement: number }>();
  const currentKpiResults = new Map<string, number[]>();
  currentMonthResults.forEach((result) => {
    currentKpiResults.set(result.item.kpi_id, [...(currentKpiResults.get(result.item.kpi_id) || []), result.achievement]);
  });
  currentKpiResults.forEach((values, id) => {
    const average = values.reduce((total, value) => total + value, 0) / values.length;
    if (average < 100) {
      belowTargetKpis.set(id, {
        title: currentMonthResults.find((result) => result.item.kpi_id === id)?.item.kpi_title || 'KPI',
        achievement: average,
      });
    }
  });

  const recentEntries = [...data.entries]
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    .slice(0, detailed ? 12 : 6);
  const monthMax = Math.max(100, ...summary.monthlyTrend.map((month) => month.achievement || 0));

  return (
    <div>
      <TopBar
        title={detailed ? 'KPIs & Analytics' : 'Overview'}
        subtitle="Operational health calculated from approved VAC-P performance records"
      />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Active team members', value: summary.activePeople, icon: Users },
            { label: 'Active KPI assignments', value: summary.activeKpis, icon: Target },
            { label: 'Active objectives', value: summary.activeObjectives, icon: BarChart3 },
            { label: 'Approved reports this month', value: summary.approvedEntriesThisMonth, icon: ClipboardCheck },
            { label: 'Average KPI achievement', value: percentage(summary.averageAchievement), icon: BarChart3 },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{label}</p>
                <Icon size={18} className="text-blue-700" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
            </article>
          ))}
        </section>

        {summary.results.length === 0 && (
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            No approved KPI results are available for the selected history yet. Dashboard performance metrics will appear after reports are reviewed and approved.
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-900">Approved KPI achievement</h2>
                <p className="text-sm text-slate-500">Monthly average, derived from approved result snapshots</p>
              </div>
              <span className="text-xs text-slate-500">Reports awaiting review: {summary.pendingEntries}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="Monthly KPI achievement">
              {summary.monthlyTrend.map((month) => (
                <div key={month.key} className="min-w-0">
                  <div className="flex h-36 items-end justify-center rounded-md bg-slate-50 p-2">
                    {month.achievement === null ? (
                      <span className="pb-2 text-xs text-slate-400">No data</span>
                    ) : (
                      <div
                        className="w-full rounded-t bg-blue-700"
                        style={{ height: `${Math.max(4, Math.min(100, month.achievement / monthMax * 100))}%` }}
                        title={`${Math.round(month.achievement)}% achievement`}
                      />
                    )}
                  </div>
                  <p className="mt-2 truncate text-center text-xs text-slate-500">{month.label}</p>
                  <p className="text-center text-xs font-semibold text-slate-700">{percentage(month.achievement)}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Organization performance</h2>
            <p className="mb-4 text-sm text-slate-500">Approved results grouped by department</p>
            {summary.departmentPerformance.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No approved department results yet.</p>
            ) : (
              <ul className="space-y-4">
                {summary.departmentPerformance.slice(0, detailed ? 12 : 5).map((department) => (
                  <li key={department.name}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-700">{department.name}</span>
                      <span className="font-semibold text-slate-900">{percentage(department.averageAchievement)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, department.averageAchievement || 0)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{department.resultCount} approved KPI results</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">KPIs requiring attention</h2>
                <p className="text-sm text-slate-500">Average approved achievement below target this month</p>
              </div>
              <ArrowDownRight className="text-amber-600" size={18} aria-hidden="true" />
            </div>
            {belowTargetKpis.size === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                {currentMonthResults.length ? 'No KPI is below target this month.' : 'No approved results are available for this month.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {Array.from(belowTargetKpis.entries()).slice(0, detailed ? 20 : 6).map(([id, kpi]) => (
                  <li key={id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="text-slate-700">{kpi.title}</span>
                    <span className="whitespace-nowrap font-semibold text-amber-700">{percentage(kpi.achievement)}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Active objectives</h2>
                <p className="text-sm text-slate-500">Objectives shared with your authorized workspace</p>
              </div>
              <ArrowUpRight className="text-blue-700" size={18} aria-hidden="true" />
            </div>
            {data.objectives.filter((objective) => objective.status === 'active').length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No active objectives found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.objectives.filter((objective) => objective.status === 'active').slice(0, detailed ? 20 : 6).map((objective) => (
                  <li key={objective.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{objective.title}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">{objective.level} · {objective.department || 'Company'}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-slate-500">{objective.end_date || 'No end date'}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">Recent reporting activity</h2>
            <p className="text-sm text-slate-500">Daily report status; only approved results contribute to achievement</p>
          </div>
          {recentEntries.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No KPI reports in this reporting period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="pb-2 pr-3">Team member</th><th className="pb-2 pr-3">Department</th><th className="pb-2 pr-3">Date</th><th className="pb-2">Status</th></tr></thead>
                <tbody>
                  {recentEntries.map((entry) => {
                    const person = data.people.find((member) => member.id === entry.user_id);
                    return (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-3 pr-3 font-medium text-slate-800">{person?.full_name || 'Team member'}</td>
                        <td className="py-3 pr-3 text-slate-600">{person?.department || 'Unassigned'}</td>
                        <td className="py-3 pr-3 text-slate-600">{entry.entry_date}</td>
                        <td className="py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{reportStatus(entry.status)}</span></td>
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
  );
}
