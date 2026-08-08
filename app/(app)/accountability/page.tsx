'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, Eye, X, Flag, ChevronLeft, ChevronRight, ClipboardList, FileText, Sparkles, CircleAlert as AlertCircle } from 'lucide-react';
import type { AccountabilityReport, Profile } from '@/lib/database.types';

type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  report_type: 'daily' | 'weekly' | 'monthly';
  role: string;
};

type ReportSection = {
  id: string;
  template_id: string;
  title: string;
  description: string;
  sort_order: number;
  questions: Question[];
};

type Question = {
  id: string;
  label: string;
  type: 'text' | 'textarea';
  required: boolean;
  auto_populate?: string;
};

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  flagged: 'bg-red-100 text-red-700',
  draft: 'bg-slate-100 text-slate-700',
};

const reportTypeIcons: Record<string, React.ElementType> = {
  daily: Clock,
  weekly: FileText,
  monthly: ClipboardList,
};

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

  // Progressive report builder state
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [autoData, setAutoData] = useState<Record<string, string>>({});

  const canReview = ['admin', 'director', 'manager'].includes(profile?.role || '');

  useEffect(() => {
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    const [{ data: reps }, { data: profs }] = await Promise.all([
      supabase.from('accountability_reports').select('*').order('report_date', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
    ]);
    const profileMap: Record<string, Profile> = {};
    (profs as Profile[] || []).forEach(p => { profileMap[p.id] = p; });
    setMembers(profileMap);
    setReports((reps as AccountabilityReport[]) || []);
    setLoading(false);
  };

  const loadTemplate = useCallback(async (rType: string, role: string) => {
    const { data: tmpls } = await supabase
      .from('report_templates')
      .select('*')
      .eq('report_type', rType)
      .eq('role', role)
      .eq('is_active', true)
      .limit(1);

    if (tmpls && tmpls.length > 0) {
      const template = tmpls[0] as ReportTemplate;
      setTemplates([template]);
      const { data: secs } = await supabase
        .from('report_sections')
        .select('*')
        .eq('template_id', template.id)
        .order('sort_order', { ascending: true });
      setSections((secs as ReportSection[]) || []);
      setCurrentStep(0);
      setResponses({});
    } else {
      // Fallback: no template found, use generic sections
      setTemplates([]);
      setSections([]);
    }
  }, []);

  const loadAutoData = async (rType: string) => {
    if (!profile) return;
    const data: Record<string, string> = {};

    if (rType === 'daily') {
      // Load today's tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status')
        .eq('assigned_to', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (tasks && tasks.length > 0) {
        data['tasks_assigned'] = tasks.filter((t: any) => t.status !== 'done').map((t: any) => t.title).join('\n');
        data['tasks_completed'] = tasks.filter((t: any) => t.status === 'done').map((t: any) => t.title).join('\n');
      }

      // Load today's check-in
      const today = new Date().toISOString().split('T')[0];
      const { data: cin } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('member_id', profile.id)
        .eq('check_in_date', today)
        .maybeSingle();
      if (cin) {
        data['planned_work'] = (cin as any).priorities || '';
        data['meetings'] = (cin as any).planned_meetings || '';
      }
    }

    // Load assigned projects
    const { data: assignments } = await supabase
      .from('project_assignments')
      .select('project_id, projects(name)')
      .eq('member_id', profile.id);
    if (assignments && assignments.length > 0) {
      data['project_status'] = assignments.map((a: any) => a.projects?.name || '').filter(Boolean).join('\n');
    }

    setAutoData(data);
  };

  const openModal = async () => {
    setShowModal(true);
    setReportType('daily');
    if (profile) {
      await loadTemplate('daily', profile.role);
      await loadAutoData('daily');
    }
  };

  const handleReportTypeChange = async (rType: 'daily' | 'weekly' | 'monthly') => {
    setReportType(rType);
    if (profile) {
      await loadTemplate(rType, profile.role);
      await loadAutoData(rType);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    // Validate required questions
    const allQuestions = sections.flatMap(s => s.questions);
    const missingRequired = allQuestions.filter(q => q.required && !responses[q.id]?.trim());
    if (missingRequired.length > 0) {
      return;
    }

    setSaving(true);
    const templateId = templates.length > 0 ? templates[0].id : null;

    // Build summary from first response
    const firstResponse = Object.values(responses)[0] || '';
    const summary = firstResponse.slice(0, 200);

    const reportData = {
      member_id: profile.id,
      report_date: new Date().toISOString().split('T')[0],
      report_type: reportType,
      report_role: profile.role,
      department: profile.department || '',
      template: 'structured' as const,
      template_id: templateId,
      report_data: responses as any,
      completed_tasks: responses['completed_work'] || responses['work_completed'] || '',
      planned_tasks: responses['next_priorities'] || responses['tomorrow_priorities'] || responses['next_week'] || responses['next_month'] || '',
      blockers: responses['blockers'] || responses['challenges'] || responses['challenges_encountered'] || '',
      notes: Object.entries(responses).filter(([k]) => !['completed_work','work_completed','next_priorities','tomorrow_priorities','next_week','next_month','blockers','challenges','challenges_encountered'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n'),
      summary,
      status: 'submitted' as const,
    };

    await supabase.from('accountability_reports').insert(reportData);

    // Also insert into weekly_reports when report type is weekly (for strict enforcement)
    if (reportType === 'weekly') {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      const weekEnd = new Date(now);
      await supabase.from('weekly_reports').insert({
        member_id: profile.id,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        accomplishments: reportData.completed_tasks || summary,
        planned_tasks: reportData.planned_tasks || '',
        blockers: reportData.blockers || 'None',
        highlights: reportData.notes || '',
        status: 'submitted',
        submitted_at: now.toISOString(),
      });
    }

    await loadAll();
    setSaving(false);
    setShowModal(false);
    setResponses({});
    setCurrentStep(0);
  };

  const handleReview = async (id: string, status: AccountabilityReport['status']) => {
    await supabase.from('accountability_reports').update({ status, reviewed_by: profile?.id }).eq('id', id);
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const filtered = reports.filter(r => {
    const matchMember = filterMember === 'all' || r.member_id === filterMember;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchMember && matchStatus;
  });

  const todayReports = reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]);
  const submittedCount = reports.filter(r => r.status === 'submitted').length;
  const flaggedCount = reports.filter(r => r.status === 'flagged').length;

  const currentSection = sections[currentStep];
  const isLastStep = currentStep === sections.length - 1;
  const isFirstStep = currentStep === 0;
  const totalSteps = sections.length;

  return (
    <div>
      <TopBar title="Accountability" subtitle="Progressive, role-based reporting" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Reports', value: reports.length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: "Today's Reports", value: todayReports.length, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Review', value: submittedCount, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
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

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            {canReview && (
              <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
                className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All Members</option>
                {Object.values(members).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            )}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['submitted','reviewed','approved','flagged'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            Submit Report
          </button>
        </div>

        {/* Reports */}
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
            <ClipboardList size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No reports found</p>
            <button onClick={openModal} className="mt-2 text-sm text-primary hover:underline">
              Submit your first report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const member = members[report.member_id];
              const ReportIcon = reportTypeIcons[report.report_type] || FileText;
              const reportData = report.report_data as Record<string, string> | null;
              return (
                <div key={report.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {member?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{member?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{new Date(report.report_date).toLocaleDateString()}</p>
                          <ReportIcon size={11} className="text-muted-foreground" />
                          <span className="text-[10px] font-medium text-muted-foreground capitalize">{report.report_type}</span>
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

                  {reportData && Object.keys(reportData).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(reportData).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="p-2.5 rounded-lg border border-border bg-muted/30">
                          <p className="font-semibold text-muted-foreground mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-foreground line-clamp-2">{value || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { label: 'Completed', value: report.completed_tasks, color: 'border-emerald-200 bg-emerald-50' },
                        { label: 'Planned', value: report.planned_tasks, color: 'border-blue-200 bg-blue-50' },
                        { label: 'Blockers', value: report.blockers, color: report.blockers ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className={`p-2.5 rounded-lg border ${color}`}>
                          <p className="font-semibold text-muted-foreground mb-1">{label}</p>
                          <p className="text-foreground line-clamp-2">{value || 'None'}</p>
                        </div>
                      ))}
                    </div>
                  )}

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

      {/* Progressive Report Builder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-border p-5 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-foreground">Submit Report</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
              </div>
              {/* Report type selector */}
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly'] as const).map(t => {
                  const Icon = reportTypeIcons[t];
                  return (
                    <button key={t}
                      onClick={() => handleReportTypeChange(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all capitalize ${reportType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}>
                      <Icon size={13} />
                      {t}
                    </button>
                  );
                })}
              </div>
              {/* Progress indicator */}
              {totalSteps > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">
                      Step {currentStep + 1} of {totalSteps}
                      {currentSection && <span className="ml-1.5 font-medium text-foreground">· {currentSection.title}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5">
              {sections.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm text-muted-foreground">No report template found for your role. Contact an administrator.</p>
                </div>
              ) : currentSection ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{currentSection.title}</h3>
                    {currentSection.description && <p className="text-xs text-muted-foreground mt-0.5">{currentSection.description}</p>}
                  </div>
                  {currentSection.questions.map(q => {
                    const autoValue = q.auto_populate ? autoData[q.auto_populate] : '';
                    const currentValue = responses[q.id] !== undefined ? responses[q.id] : (autoValue || '');
                    return (
                      <div key={q.id}>
                        <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          {q.label}
                          {q.required && <span className="text-red-500">*</span>}
                          {q.auto_populate && autoValue && (
                            <span className="text-[10px] text-blue-600 flex items-center gap-0.5">
                              <Sparkles size={9} /> auto-filled
                            </span>
                          )}
                        </Label>
                        {q.type === 'textarea' ? (
                          <Textarea
                            value={currentValue}
                            onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                            placeholder={`Enter ${q.label.toLowerCase()}...`}
                            rows={3}
                          />
                        ) : (
                          <input
                            type="text"
                            value={currentValue}
                            onChange={e => setResponses({ ...responses, [q.id]: e.target.value })}
                            placeholder={`Enter ${q.label.toLowerCase()}...`}
                            className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Navigation */}
            {sections.length > 0 && (
              <div className="sticky bottom-0 bg-white border-t border-border p-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={isFirstStep}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} /> Back
                </button>
                {isLastStep ? (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving ? 'Submitting...' : 'Submit Report'}
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(Math.min(sections.length - 1, currentStep + 1))}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
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
                  {members[selected.member_id]?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{members[selected.member_id]?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(selected.report_date).toLocaleDateString()} · {selected.report_type}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            {selected.report_data && Object.keys(selected.report_data as Record<string, string>).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(selected.report_data as Record<string, string>).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{value || 'None'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Completed Tasks', value: selected.completed_tasks, bg: 'bg-emerald-50' },
                  { label: 'Planned Tasks', value: selected.planned_tasks, bg: 'bg-blue-50' },
                  { label: 'Blockers', value: selected.blockers, bg: selected.blockers ? 'bg-red-50' : 'bg-muted/30' },
                  { label: 'Notes', value: selected.notes, bg: 'bg-muted/30' },
                ].map(({ label, value, bg }) => (
                  <div key={label} className={`p-3 rounded-lg ${bg}`}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{value || 'None'}</p>
                  </div>
                ))}
              </div>
            )}
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
