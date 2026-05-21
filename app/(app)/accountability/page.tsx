'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountabilityReport, Profile, Project, Task } from '@/lib/database.types';
import {
  getRoleReportTemplate,
  buildRoleReportDefaults,
  getVisibleRoleReportFields,
  summarizeRoleReport,
  scoreOperationalHealth,
  buildTaskSuggestions,
  RoleReportField,
  RoleReportTemplate,
} from '@/lib/accountability';
import { createNotification } from '@/lib/queries';
import { Plus, CircleCheck as CheckCircle, Clock, Eye, X, Flag } from 'lucide-react';

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-sky-100 text-sky-700',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  flagged: 'bg-red-100 text-red-700',
};

const reportTypes: Array<AccountabilityReport['report_type']> = ['daily', 'weekly', 'monthly', 'sprint', 'milestone', 'escalation'];
const reviewRoles = ['admin', 'director', 'manager'];

export default function AccountabilityPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<AccountabilityReport[]>([]);
  const [members, setMembers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<AccountabilityReport | null>(null);
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [template, setTemplate] = useState<RoleReportTemplate>(getRoleReportTemplate(profile?.role));
  const [form, setForm] = useState<Record<string, any>>(buildRoleReportDefaults(profile?.role));

  const canReview = reviewRoles.includes(profile?.role || '');

  useEffect(() => {
    loadAll();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const nextTemplate = getRoleReportTemplate(profile.role);
    setTemplate(nextTemplate);
    setForm(buildRoleReportDefaults(profile.role));
  }, [profile?.role]);

  const taskSuggestions = useMemo(
    () => buildTaskSuggestions(profile, tasks, projects),
    [profile, tasks, projects],
  );

  const visibleFields = useMemo(
    () => getVisibleRoleReportFields(template, form),
    [template, form],
  );

  const loadAll = async () => {
    setLoading(true);
    const [reportsResponse, profilesResponse, tasksResponse, projectsResponse] = await Promise.all([
      supabase.from('accountability_reports').select('*').order('report_date', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('projects').select('*'),
    ]);
    const reps = reportsResponse.data;
    const profs = profilesResponse.data;
    const tasksData = tasksResponse.data;
    const projectsData = projectsResponse.data;
    const profileMap: Record<string, Profile> = {};
    (profs as Profile[] || []).forEach((p) => { profileMap[p.id] = p; });
    setMembers(profileMap);
    setReports((reps as AccountabilityReport[]) || []);
    setTasks((tasksData as Task[]) || []);
    setProjects((projectsData as Project[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    const missingRequired = template.fields.some((field) => field.required && (form[field.id] === '' || form[field.id] === null || form[field.id] === undefined));
    if (missingRequired) return;

    setSaving(true);
    const reportData = Object.fromEntries(visibleFields.map((field) => [field.id, form[field.id]]));
    const relatedTaskIds = tasks.filter((task) => task.assigned_to === profile.id && task.status !== 'todo').map((task) => task.id);
    const relatedProjectIds = Array.from(new Set(tasks.filter((task) => task.assigned_to === profile.id && task.project_id).map((task) => task.project_id!)));
    const reportStatus: AccountabilityReport['status'] = ['weekly', 'monthly', 'sprint', 'milestone', 'escalation'].includes(form.report_type) ? 'pending_approval' : 'submitted';
    const risk_level = (form.operational_risk ?? 'normal') as AccountabilityReport['risk_level'];
    const confidence_score = Number(form.delivery_confidence ?? form.confidence_score ?? 0) || null;
    const operational_health = scoreOperationalHealth(reportData);
    const summary = summarizeRoleReport(template, reportData);
    const kpi_snapshot = Object.fromEntries(visibleFields
      .filter((field) => field.type === 'number' || field.type === 'slider')
      .map((field) => [field.id, Number(form[field.id] ?? 0)]),
    );

    const insertResponse = await supabase.from('accountability_reports').insert({
      member_id: profile.id,
      report_date: new Date().toISOString().split('T')[0],
      report_type: form.report_type || 'daily',
      report_role: profile.role,
      department: profile.department,
      template: 'structured',
      report_data: reportData,
      summary,
      kpi_snapshot,
      related_project_ids: relatedProjectIds,
      related_task_ids: relatedTaskIds,
      operational_health,
      confidence_score,
      risk_level,
      status: reportStatus,
      review_notes: '',
    });

    if (insertResponse.error) {
      setSaving(false);
      return;
    }

    await createNotification({
      user_id: profile.id,
      title: 'Accountability report submitted',
      message: `A new ${form.report_type || 'daily'} report was submitted by ${profile.full_name}.`,
      type: 'info',
      link: '/app/accountability',
    });

    await loadAll();
    setSaving(false);
    setShowModal(false);
    setForm(buildRoleReportDefaults(profile.role));
  };

  const handleReview = async (id: string, status: AccountabilityReport['status']) => {
    if (!profile) return;
    const { error } = await supabase
      .from('accountability_reports')
      .update({ status, reviewed_by: profile.id })
      .eq('id', id);

    if (error) return;

    setReports((current) => current.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) {
      setSelected({ ...selected, status } as AccountabilityReport);
    }

    await createNotification({
      user_id: profile.id,
      title: 'Accountability report reviewed',
      message: `Report ${id} has been marked ${status} by ${profile.full_name}.`,
      type: status === 'approved' ? 'success' : status === 'flagged' ? 'error' : 'info',
      link: '/app/accountability',
    });
  };

  const filtered = reports.filter(r => {
    const matchMember = filterMember === 'all' || r.member_id === filterMember;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchMember && matchStatus;
  });

  const todayReports = reports.filter((r) => r.report_date === new Date().toISOString().split('T')[0]);
  const submittedCount = reports.filter((r) => r.status === 'submitted').length;
  const flaggedCount = reports.filter((r) => r.status === 'flagged').length;

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'None';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return String(value);
    return String(value);
  };

  const renderField = (field: RoleReportField) => {
    const value = form[field.id];
    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => setForm({ ...form, [field.id]: Number(e.target.value) })}
            className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
          />
        );
      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        );
      case 'select':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>
            ))}
          </select>
        );
      case 'slider':
        return (
          <div className="space-y-2">
            <input
              type="range"
              min={field.min ?? 0}
              max={field.max ?? 100}
              value={value ?? 0}
              onChange={(e) => setForm({ ...form, [field.id]: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{field.min ?? 0}</span>
              <span>{value ?? 0}</span>
              <span>{field.max ?? 100}</span>
            </div>
          </div>
        );
      case 'toggle':
        return (
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => setForm({ ...form, [field.id]: e.target.checked })}
              className="rounded border border-input text-primary focus:ring-primary"
            />
            <span>{field.label}</span>
          </label>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <TopBar title="Accountability" subtitle="Operational intelligence through structured reporting" />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: reports.length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: "Today's Reports", value: todayReports.length, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Submitted', value: submittedCount, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Flagged', value: flaggedCount, icon: Flag, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            {canReview && (
              <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)}
                className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All Members</option>
                {Object.values(members).map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            )}
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['submitted', 'pending_approval', 'reviewed', 'approved', 'flagged'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            Submit Report
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <CheckCircle size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No reports found</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-primary hover:underline">
              Submit your first report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => {
              const member = members[report.member_id];
              return (
                <div key={report.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {member?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{member?.full_name || 'Unknown'}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(report.report_date).toLocaleDateString()}</span>
                          <span className="capitalize">{report.report_type}</span>
                          <span className="capitalize">{report.report_role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColors[report.status]}`}>
                        {report.status}
                      </span>
                      <button
                        onClick={() => setSelected(report)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                      <p className="font-semibold text-muted-foreground mb-1">Health</p>
                      <p className="text-foreground">{report.operational_health ?? '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50">
                      <p className="font-semibold text-muted-foreground mb-1">Confidence</p>
                      <p className="text-foreground">{report.confidence_score ?? '—'}</p>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${report.risk_level === 'high' || report.risk_level === 'critical' ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30'}`}>
                      <p className="font-semibold text-muted-foreground mb-1">Risk Level</p>
                      <p className="text-foreground capitalize">{report.risk_level || 'normal'}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{report.summary || report.notes || 'No structured summary available.'}</p>

                  {canReview && report.status === 'submitted' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mr-auto">Review action:</p>
                      <button onClick={() => handleReview(report.id, 'approved')}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleReview(report.id, 'flagged')}
                        className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                        Flag
                      </button>
                      <button onClick={() => handleReview(report.id, 'reviewed')}
                        className="px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                        Mark Reviewed
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-foreground">Submit a Role-Based Report</h2>
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Report Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {reportTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, report_type: type })}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all capitalize ${form.report_type === type ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Report Template</label>
                  <div className="rounded-xl border border-border bg-muted/50 p-3">
                    <p className="text-sm font-semibold text-foreground">{template.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{template.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {visibleFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}{field.required ? ' *' : ''}</label>
                    {field.hint && <p className="text-[11px] text-muted-foreground mb-2">{field.hint}</p>}
                    {renderField(field)}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Smart suggestions</p>
                {taskSuggestions.map((suggestion, idx) => (
                  <p key={idx} className="text-sm text-foreground">• {suggestion}</p>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground">Report Details</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold">
                  {members[selected.member_id]?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{members[selected.member_id]?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(selected.report_date).toLocaleDateString()} · {selected.report_type}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                  <p className="font-semibold text-muted-foreground mb-1">Health</p>
                  <p className="text-foreground">{selected.operational_health ?? '—'}</p>
                </div>
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                  <p className="font-semibold text-muted-foreground mb-1">Confidence</p>
                  <p className="text-foreground">{selected.confidence_score ?? '—'}</p>
                </div>
                <div className={`p-3 rounded-lg border ${selected.risk_level === 'high' || selected.risk_level === 'critical' ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30'}`}>
                  <p className="font-semibold text-muted-foreground mb-1">Risk Level</p>
                  <p className="text-foreground capitalize">{selected.risk_level || 'normal'}</p>
                </div>
              </div>
              {selected.template === 'structured' && selected.report_data ? (
                Object.entries(selected.report_data).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-foreground">{formatValue(value)}</p>
                  </div>
                ))
              ) : (
                [
                  { label: 'Completed Tasks', value: selected.completed_tasks, bg: 'bg-emerald-50' },
                  { label: 'Planned Tasks', value: selected.planned_tasks, bg: 'bg-blue-50' },
                  { label: 'Blockers', value: selected.blockers, bg: selected.blockers ? 'bg-red-50' : 'bg-muted/30' },
                  { label: 'Notes', value: selected.notes, bg: 'bg-muted/30' },
                ].map(({ label, value, bg }) => (
                  <div key={label} className={`p-3 rounded-lg ${bg}`}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-foreground">{value || 'None'}</p>
                  </div>
                ))
              )}
            </div>
            {canReview && (
              <div className="flex gap-2 mt-5">
                <button onClick={() => handleReview(selected.id, 'approved')}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
                <button onClick={() => handleReview(selected.id, 'flagged')}
                  className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Flag</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
