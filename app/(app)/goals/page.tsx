'use client';

import { useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { usePerformanceData } from '@/hooks/use-performance-data';
import { calculateAchievementPercent } from '@/lib/performance';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Building2, CalendarDays, Plus, Target } from 'lucide-react';

type ObjectiveLevel = 'company' | 'department' | 'team' | 'individual';

export default function ObjectivesPage() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = usePerformanceData(12);
  const [levelFilter, setLevelFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<ObjectiveLevel>('individual');
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '');
  const [endDate, setEndDate] = useState('');

  const canManageCompanyObjectives = ['admin', 'director', 'ceo', 'executive'].includes(profile?.role || '');
  const canManageDepartmentObjectives = ['admin', 'director', 'ceo', 'executive', 'manager', 'marketing_manager', 'hr', 'legal_counsel'].includes(profile?.role || '');
  const canCreate = profile?.role !== 'partner';
  const levelOptions: ObjectiveLevel[] = canManageCompanyObjectives
    ? ['company', 'department', 'team', 'individual']
    : canManageDepartmentObjectives
      ? ['department', 'team', 'individual']
      : ['individual'];

  const objectives = useMemo(() => {
    if (!data) return [];
    return data.objectives
      .filter((objective) => levelFilter === 'all' || objective.level === levelFilter)
      .map((objective) => {
        const linkedKpis = data.kpis.filter((kpi) => kpi.objective_id === objective.id);
        const results = data.items.flatMap((item) => {
          if (item.objective_id !== objective.id || item.number_value === null) return [];
          const entry = data.entries.find((candidate) => candidate.id === item.entry_id);
          if (!entry || entry.status !== 'approved') return [];
          const achievement = calculateAchievementPercent(item.number_value, item.target_value, item.measurement_direction);
          return achievement === null ? [] : [achievement];
        });
        const progress = results.length
          ? results.reduce((sum, value) => sum + value, 0) / results.length
          : null;
        return { objective, linkedKpis, progress, resultCount: results.length };
      });
  }, [data, levelFilter]);

  const createObjective = async () => {
    if (!profile || !title.trim() || saving) return;
    if (!levelOptions.includes(level)) {
      toast.error('You do not have permission to create an objective at this level.');
      return;
    }

    const department = level === 'company'
      ? null
      : data?.departments.find((item) => item.id === departmentId) || null;
    if (level !== 'company' && !department) {
      toast.error('Choose an accessible department for this objective.');
      return;
    }

    setSaving(true);
    const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
    const { error: saveError } = await supabase.from('objectives').insert({
      title: title.trim(),
      description: description.trim() || null,
      level,
      department: department?.name || '',
      department_id: department?.id || null,
      quarter: currentQuarter,
      year: new Date().getFullYear(),
      owner_id: profile.id,
      end_date: endDate || null,
      status: 'active',
    });
    if (saveError) {
      console.error('Unable to create objective:', saveError.message);
      toast.error(saveError.message || 'Unable to create the objective.');
      setSaving(false);
      return;
    }

    toast.success('Objective created.');
    setTitle('');
    setDescription('');
    setEndDate('');
    setLevel('individual');
    setDepartmentId(profile.department_id || '');
    setShowForm(false);
    setSaving(false);
    await reload();
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Objectives" subtitle="Loading shared objectives and linked KPI results" />
        <SybellaLoadingState text="Loading objectives" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <TopBar title="Objectives" subtitle="Objectives are measured through approved KPI results" />
        <main className="p-4 sm:p-6">
          <section role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-800">
            <p>{error || 'Objective data is unavailable.'}</p>
            <button type="button" onClick={() => void reload()} className="mt-3 rounded-md bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800">Retry</button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Objectives" subtitle="Strategic priorities connected to approved KPI outcomes" />
      <main className="space-y-5 p-4 sm:p-6">
        <section className="flex flex-wrap items-end justify-between gap-3">
          <label className="text-xs font-medium text-slate-600">
            <span className="mb-1 block">Objective level</span>
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="h-10 min-w-48 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option value="all">All accessible objectives</option>
              <option value="company">Company</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="individual">Individual</option>
            </select>
          </label>
          {canCreate && (
            <button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
              <Plus size={16} /> {showForm ? 'Cancel' : 'New objective'}
            </button>
          )}
        </section>

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Create objective</h2>
            <p className="mt-1 text-sm text-slate-500">Objective progress comes from linked, approved KPI results. Avoid entering the same result twice.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Title
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" placeholder="Increase recurring revenue" />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-md border border-slate-300 p-3 text-sm font-normal" placeholder="Describe the intended outcome and context" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Level
                <select value={level} onChange={(event) => setLevel(event.target.value as ObjectiveLevel)} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal">
                  {levelOptions.map((option) => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                </select>
              </label>
              {level !== 'company' && (
                <label className="text-sm font-medium text-slate-700">
                  Department
                  <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} disabled={!canManageCompanyObjectives} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal disabled:bg-slate-50">
                    <option value="">Select department</option>
                    {data.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm font-medium text-slate-700">
                Target date
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal" />
              </label>
              <div className="flex items-end sm:col-span-2">
                <button type="button" onClick={() => void createObjective()} disabled={!title.trim() || saving} className="h-10 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'Saving…' : 'Create objective'}
                </button>
              </div>
            </div>
          </section>
        )}

        {objectives.length === 0 ? (
          <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Target className="mx-auto text-slate-400" size={30} aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-800">No objectives found</h2>
            <p className="mt-1 text-sm text-slate-500">Create an objective or change the level filter. Progress appears when linked KPIs have approved results.</p>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {objectives.map(({ objective, linkedKpis, progress, resultCount }) => (
              <article key={objective.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-blue-700">
                      <Building2 size={14} aria-hidden="true" /> {objective.level} · {objective.department || 'Company'}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">{objective.title}</h2>
                    {objective.description && <p className="mt-1 text-sm text-slate-600">{objective.description}</p>}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">{objective.status}</span>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Approved KPI achievement</span>
                    <span className="font-semibold text-slate-900">{progress === null ? 'No approved results' : `${Math.round(progress)}%`}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    {progress !== null && <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{resultCount} approved KPI results · target {objective.quarter || '—'} {objective.year}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Linked KPIs</p>
                  {linkedKpis.length ? (
                    <ul className="mt-2 space-y-2">
                      {linkedKpis.map((kpi) => (
                        <li key={kpi.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-700">{kpi.title}</span>
                          <span className="whitespace-nowrap text-slate-500">{kpi.target} {kpi.unit} / {kpi.frequency}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-sm text-slate-500">No KPIs linked yet. An administrator can connect KPIs in KPI configuration.</p>}
                </div>
                {objective.end_date && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} aria-hidden="true" /> Target date {objective.end_date}</p>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
