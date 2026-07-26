'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import type { Profile, Project, Customer } from '@/lib/database.types';
import {
  ArrowLeft, Briefcase, FileText, Building2, DollarSign, Wallet, Users, Calendar,
  ListTree, FolderOpen, TriangleAlert, MessageSquare, Activity, ChartBar as BarChart3,
  Archive, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Plus, Trash2,
  CreditCard as Edit2, X, GitBranch, GitCommitVertical as GitCommit, ShieldAlert,
  Network, Download, Check, Loader2, Send,
} from 'lucide-react';
import { toast } from 'sonner';

interface Milestone { id: string; name: string; target_date: string | null; status: string; }
interface Phase { id: string; name: string; description: string; status: string; progress: number; }
interface TaskRow { id: string; title: string; description: string; status: string; priority: string; assigned_to: string | null; estimated_hours: number | null; }
interface RiskRow { id: string; risk: string; probability: string; impact: string; mitigation: string; status: string; }
interface DependencyRow { id: string; description: string; dependency_type: string; status: string; due_date: string | null; }
interface DocumentRow { id: string; name: string; document_type: string; folder: string; url: string; }
interface ChecklistRow { id: string; item: string; is_done: boolean; }
interface ActivityRow { id: string; action: string; description: string; created_at: string; actor?: { full_name: string }; }
interface ChangeRequestRow { id: string; title: string; change_type: string; status: string; description: string; impact_analysis: string; }
interface AssignmentRow { id: string; member_id: string; role_in_project: string; can_edit_tasks: boolean; can_manage_members: boolean; member?: { full_name: string; role: string }; }
interface BudgetProposalRow { id: string; title: string; description: string; amount: number; currency: string; category: string; status: string; priority: string; current_step: number; total_steps: number; }

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Briefcase },
  { id: 'scope', label: 'Scope & Description', icon: FileText },
  { id: 'customer', label: 'Customer Information', icon: Building2 },
  { id: 'financial', label: 'Financial Performance', icon: DollarSign },
  { id: 'budget', label: 'Budget Proposals', icon: Wallet },
  { id: 'team', label: 'Team & Resources', icon: Users },
  { id: 'timeline', label: 'Timeline & Milestones', icon: Calendar },
  { id: 'tasks', label: 'Tasks & Progress', icon: ListTree },
  { id: 'documents', label: 'Documents & Repository', icon: FolderOpen },
  { id: 'risks', label: 'Risks & Issues', icon: TriangleAlert },
  { id: 'changes', label: 'Change Requests', icon: GitCommit },
  { id: 'communications', label: 'Communications', icon: MessageSquare },
  { id: 'activity', label: 'Activity Log', icon: Activity },
  { id: 'analytics', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'archive', label: 'Archive & Close', icon: Archive },
] as const;

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700', completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

async function logActivity(projectId: string, action: string, description: string, actorId: string | null, metadata?: Record<string, unknown>) {
  await supabase.from('project_activity_log').insert({
    project_id: projectId, action, description, actor_id: actorId, metadata: metadata || {},
  });
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [budgetProposals, setBudgetProposals] = useState<BudgetProposalRow[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [showCloseConfirm, setShowCloseConfirm] = useState<null | 'completed' | 'cancelled'>(null);
  const [closing, setClosing] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [crForm, setCrForm] = useState({ title: '', description: '', change_type: 'scope', impact_analysis: '' });
  const [showTaskUpdate, setShowTaskUpdate] = useState<string | null>(null);
  const [taskUpdate, setTaskUpdate] = useState('');
  const [exporting, setExporting] = useState(false);

  const canManage = ['admin', 'director', 'manager'].includes(profile?.role || '');
  const isArchived = project?.status === 'completed' || project?.status === 'cancelled';

  useEffect(() => { if (projectId) loadAll(); }, [projectId]);

  async function loadAll() {
    setLoading(true);
    const [{ data: proj }, { data: profs }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
    ]);
    const p = proj as Project | null;
    setProject(p); setEditForm(p || {}); setMembers((profs as Profile[]) || []);
    if (p?.customer_id) {
      const { data: cust } = await supabase.from('customers').select('*').eq('id', p.customer_id).maybeSingle();
      setCustomer(cust as Customer | null);
    }
    const [miles, phs, tks, rks, deps, docs, chk, act, crs, asg, bps] = await Promise.all([
      supabase.from('project_milestones').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_phases').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_risks').select('*').eq('project_id', projectId),
      supabase.from('project_dependencies').select('*').eq('project_id', projectId),
      supabase.from('project_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_requirements_checklist').select('*').eq('project_id', projectId).order('sort_order'),
      supabase.from('project_activity_log').select('*, actor:profiles!project_activity_log_actor_id_fkey(full_name)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
      supabase.from('project_change_requests').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_assignments').select('*, member:profiles!project_assignments_member_id_fkey(full_name, role)').eq('project_id', projectId),
      supabase.from('budget_proposals').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    setMilestones((miles.data as Milestone[]) || []); setPhases((phs.data as Phase[]) || []);
    setTasks((tks.data as TaskRow[]) || []); setRisks((rks.data as RiskRow[]) || []);
    setDependencies((deps.data as DependencyRow[]) || []); setDocuments((docs.data as DocumentRow[]) || []);
    setChecklist((chk.data as ChecklistRow[]) || []); setActivity((act.data as ActivityRow[]) || []);
    setChangeRequests((crs.data as ChangeRequestRow[]) || []); setAssignments((asg.data as AssignmentRow[]) || []);
    setBudgetProposals((bps.data as BudgetProposalRow[]) || []);
    setLoading(false);
  }

  async function logAndReload(action: string, description: string) {
    await logActivity(projectId, action, description, profile?.id || null);
    loadAll();
  }

  async function saveEdit() {
    if (!project) return;
    const { error } = await supabase.from('projects').update({
      name: editForm.name, description: editForm.description, priority: editForm.priority,
      status: editForm.status, start_date: editForm.start_date, end_date: editForm.end_date, progress: editForm.progress,
    }).eq('id', project.id);
    if (error) { toast.error('Failed to save: ' + error.message); return; }
    toast.success('Project updated');
    await logActivity(project.id, 'project_updated', `Project details updated by ${profile?.full_name || 'Unknown'}`, profile?.id || null);
    setEditing(false); loadAll();
  }

  async function toggleChecklistItem(id: string, current: boolean, item: string) {
    await supabase.from('project_requirements_checklist').update({ is_done: !current }).eq('id', id);
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, is_done: !current } : c));
    await logActivity(projectId, 'checklist_toggled', `Checklist item "${item}" marked as ${!current ? 'done' : 'pending'}`, profile?.id || null);
  }

  async function updateTaskStatus(taskId: string, status: string, taskTitle: string) {
    await supabase.from('tasks').update({ status }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    await logActivity(projectId, 'task_status_changed', `Task "${taskTitle}" status changed to ${status.replace('_', ' ')}`, profile?.id || null);
    toast.success('Task updated');
  }

  async function addTaskUpdate(taskId: string, taskTitle: string) {
    if (!taskUpdate.trim()) return;
    await logActivity(projectId, 'task_update_added', `Update on "${taskTitle}": ${taskUpdate}`, profile?.id || null, { task_id: taskId });
    setTaskUpdate(''); setShowTaskUpdate(null);
    toast.success('Update added to activity log');
    loadAll();
  }

  async function closeProject(type: 'completed' | 'cancelled') {
    if (!project) return;
    setClosing(true);
    const { error } = await supabase.from('projects').update({ status: type, progress: type === 'completed' ? 100 : project.progress }).eq('id', project.id);
    if (error) { toast.error('Failed: ' + error.message); setClosing(false); return; }
    await logActivity(project.id, type === 'completed' ? 'project_completed' : 'project_cancelled',
      `Project "${project.name}" ${type === 'completed' ? 'marked as completed and archived' : 'cancelled and archived'} by ${profile?.full_name || 'Unknown'}`,
      profile?.id || null, { previous_status: project.status });
    // Notify team members
    const teamIds = assignments.filter(a => a.member_id !== profile?.id).map(a => a.member_id);
    if (teamIds.length > 0) {
      await supabase.from('notifications').insert(teamIds.map(uid => ({
        user_id: uid, title: type === 'completed' ? 'Project Completed' : 'Project Cancelled',
        message: `Project "${project.name}" has been ${type === 'completed' ? 'completed and archived' : 'cancelled'}.`,
        type: type === 'completed' ? 'success' : 'warning', is_read: false, link: `/projects/${project.id}`,
      })));
    }
    setClosing(false); setShowCloseConfirm(null);
    toast.success(type === 'completed' ? 'Project completed and archived' : 'Project cancelled and archived');
    loadAll();
  }

  async function createChangeRequest() {
    if (!crForm.title.trim()) return;
    const { error } = await supabase.from('project_change_requests').insert({
      project_id: projectId, title: crForm.title, description: crForm.description,
      change_type: crForm.change_type, impact_analysis: crForm.impact_analysis,
      status: 'pending', requested_by: profile?.id,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    await logActivity(projectId, 'change_request_created', `Change request "${crForm.title}" submitted by ${profile?.full_name || 'Unknown'}`, profile?.id || null);
    setCrForm({ title: '', description: '', change_type: 'scope', impact_analysis: '' });
    setShowChangeRequest(false); toast.success('Change request submitted');
    loadAll();
  }

  async function approveChangeRequest(id: string, title: string) {
    await supabase.from('project_change_requests').update({ status: 'approved', approved_by: profile?.id, approved_at: new Date().toISOString() }).eq('id', id);
    await logActivity(projectId, 'change_request_approved', `Change request "${title}" approved by ${profile?.full_name}`, profile?.id || null);
    toast.success('Change request approved'); loadAll();
  }

  async function exportProject() {
    if (!project) return;
    setExporting(true);
    const data = {
      project, customer, milestones, phases, tasks, risks, dependencies,
      documents, checklist, changeRequests, assignments, budgetProposals, activity,
      exported_at: new Date().toISOString(), exported_by: profile?.full_name,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${project.project_code || project.name}-export.json`;
    a.click(); URL.revokeObjectURL(url);
    await logActivity(projectId, 'project_exported', `Project exported by ${profile?.full_name}`, profile?.id || null);
    setExporting(false); toast.success('Project exported');
  }

  if (loading) {
    return (<div><TopBar title="Project" subtitle="Loading..." />
      <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></div>);
  }
  if (!project) {
    return (<div><TopBar title="Project" subtitle="Not found" />
      <div className="p-6 text-center"><p className="text-muted-foreground">Project not found.</p>
      <button onClick={() => router.push('/projects')} className="mt-3 text-sm text-primary hover:underline">Back to Projects</button></div></div>);
  }

  const taskStatusColor = (s: string) => ({
    done: 'bg-emerald-100 text-emerald-700', in_progress: 'bg-blue-100 text-blue-700',
    todo: 'bg-gray-100 text-gray-600', review: 'bg-amber-100 text-amber-700', blocked: 'bg-red-100 text-red-600',
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div>
      <TopBar title={project.name} subtitle={project.project_code || `Project · ${(project.project_type || 'internal').replace('_', ' ')}`} />
      <div className="flex">
        <aside className="w-56 bg-white border-r border-border h-[calc(100vh-64px)] overflow-y-auto flex-shrink-0 sticky top-16">
          <div className="p-3">
            <button onClick={() => router.push('/projects')} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft size={14} /> All Projects
            </button>
            <div className="space-y-0.5">
              {SECTIONS.map((section) => { const Icon = section.icon; return (
                <button key={section.id} onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === section.id ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <Icon size={15} /><span className="text-xs">{section.label}</span>
                </button>);})}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <button onClick={exportProject} disabled={exporting}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50">
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export Project
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 p-6 overflow-y-auto">
          {isArchived && (
            <div className="mb-4 p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-2">
              <Archive size={16} className="text-slate-500" />
              <p className="text-sm text-slate-600">This project has been {project.status}. It is archived and no longer appears in active projects.</p>
            </div>
          )}

          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div><h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{project.description || 'No description'}</p></div>
                {canManage && !isArchived && (
                  <button onClick={() => setEditing(!editing)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50">
                    <Edit2 size={13} /> {editing ? 'Cancel' : 'Edit'}
                  </button>)}
              </div>
              {editing ? (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="Project name" />
                  <textarea value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none" placeholder="Description" />
                  <div className="grid grid-cols-3 gap-3">
                    <select value={editForm.status || 'planning'} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
                      {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                    <select value={editForm.priority || 'medium'} onChange={e => setEditForm({ ...editForm, priority: e.target.value as any })} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
                      {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="number" value={editForm.progress || 0} onChange={e => setEditForm({ ...editForm, progress: Number(e.target.value) })} className="px-3 py-2 text-sm border border-slate-300 rounded-lg" placeholder="Progress %" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-slate-500">Start Date</label><input type="date" value={editForm.start_date || ''} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" /></div>
                    <div><label className="text-xs text-slate-500">End Date</label><input type="date" value={editForm.end_date || ''} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" /></div>
                  </div>
                  <button onClick={saveEdit} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">Save Changes</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[{ label: 'Status', value: project.status?.replace('_', ' '), color: statusColors[project.status] },
                      { label: 'Priority', value: project.priority },
                      { label: 'Progress', value: `${project.progress}%` },
                      { label: 'Type', value: (project.project_type || 'internal').replace('_', ' ') },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white rounded-xl border border-slate-200 p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        {color ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color} inline-block mt-1`}>{value}</span>
                          : <p className="text-sm font-semibold text-slate-700 capitalize mt-1">{value}</p>}
                      </div>))}
                  </div>
                  <div><p className="text-sm font-semibold text-slate-700 mb-2">Progress</p>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full"><div className="h-2.5 bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} /></div>
                  </div>
                  {project.objectives && project.objectives.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Objectives</p>
                      <ul className="space-y-1">{project.objectives.filter(o => o).map((o, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" /> {o}</li>))}</ul>
                    </div>)}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">{project.tags.map(tag => (
                      <span key={tag} className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">{tag}</span>))}</div>)}
                </>)}
            </div>
          )}

          {/* SCOPE */}
          {activeSection === 'scope' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Scope & Description</h3>
              <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm text-slate-600">{project.description || 'No description provided.'}</p></div>
              {project.deliverables && project.deliverables.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold text-slate-700 mb-2">Deliverables</p>
                  <ul className="space-y-1">{project.deliverables.filter(d => d).map((d, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><CheckCircle size={14} className="text-blue-500 mt-0.5" /> {d}</li>))}</ul></div>)}
              {project.success_criteria && project.success_criteria.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold text-slate-700 mb-2">Success Criteria</p>
                  <ul className="space-y-1">{project.success_criteria.filter(s => s).map((s, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><CheckCircle size={14} className="text-emerald-500 mt-0.5" /> {s}</li>))}</ul></div>)}
            </div>)}

          {/* CUSTOMER */}
          {activeSection === 'customer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Customer Information</h3>
              {customer ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><span className="text-primary font-bold">{customer.name.charAt(0)}</span></div>
                    <div><p className="font-semibold text-slate-800">{customer.name}</p><p className="text-sm text-slate-500">{customer.company}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[['Email', customer.email], ['Phone', customer.phone], ['Country', customer.country], ['City', customer.city],
                      ['Industry', customer.industry], ['TIN', customer.tin], ['Website', customer.website], ['Contact', customer.contact_person_name],
                    ].map(([label, value]) => value ? (<div key={label}><p className="text-xs text-slate-400">{label}</p><p className="text-sm text-slate-700">{value}</p></div>) : null)}
                  </div>
                </div>) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Building2 size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">Internal project — no external customer.</p></div>)}
            </div>)}

          {/* FINANCIAL */}
          {activeSection === 'financial' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Financial Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[{ label: 'Customer Price', value: `$${(project.customer_price || 0).toLocaleString()}`, color: 'text-emerald-600' },
                  { label: 'Budget', value: `$${(project.budget || 0).toLocaleString()}`, color: 'text-blue-600' },
                  { label: 'Spent', value: `$${(project.spent || 0).toLocaleString()}`, color: 'text-red-600' },
                  { label: 'Expected Revenue', value: `$${(project.expected_revenue || 0).toLocaleString()}`, color: 'text-emerald-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400">{label}</p><p className={`text-lg font-bold ${color}`}>{value}</p></div>))}
              </div>
              {project.estimated_costs && Object.keys(project.estimated_costs).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold text-slate-700 mb-3">Estimated Cost Breakdown</p>
                  <div className="space-y-2">{Object.entries(project.estimated_costs).filter(([_, v]) => Number(v) > 0).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm"><span className="text-slate-600 capitalize">{key}</span><span className="font-semibold text-slate-800">${Number(value).toLocaleString()}</span></div>))}</div>
                </div>)}
            </div>)}

          {/* BUDGET PROPOSALS */}
          {activeSection === 'budget' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Budget Proposals</h3>
              {budgetProposals.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Wallet size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No budget proposals for this project.</p></div>
              ) : (
                <div className="space-y-3">{budgetProposals.map(bp => (
                  <div key={bp.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div><p className="text-sm font-semibold text-slate-800">{bp.title}</p><p className="text-xs text-slate-500 mt-0.5">{bp.description}</p></div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${bp.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : bp.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{bp.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                      <div><p className="text-slate-400">Amount</p><p className="font-semibold text-slate-700">{bp.currency} {bp.amount.toLocaleString()}</p></div>
                      <div><p className="text-slate-400">Category</p><p className="font-semibold text-slate-700">{bp.category}</p></div>
                      <div><p className="text-slate-400">Priority</p><p className="font-semibold text-slate-700">{bp.priority}</p></div>
                      <div><p className="text-slate-400">Approval Step</p><p className="font-semibold text-slate-700">{bp.current_step} / {bp.total_steps}</p></div>
                    </div>
                  </div>))}</div>)}
            </div>)}

          {/* TEAM */}
          {activeSection === 'team' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Team & Resource Allocation</h3>
              {assignments.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Users size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No team members assigned.</p></div>
              ) : (
                <div className="space-y-2">{assignments.map((a) => (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"><span className="text-white text-xs font-bold">{a.member?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}</span></div>
                    <div className="flex-1"><p className="text-sm font-semibold text-slate-800">{a.member?.full_name || 'Unknown'}</p><p className="text-xs text-slate-500 capitalize">{a.role_in_project.replace('_', ' ')}</p></div>
                    <div className="flex gap-1">{a.can_edit_tasks && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Tasks</span>}{a.can_manage_members && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Manage</span>}</div>
                    <span className="text-xs text-slate-400">{a.member?.role}</span>
                  </div>))}</div>)}
            </div>)}

          {/* TIMELINE */}
          {activeSection === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Timeline & Milestones</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[['Start', project.start_date], ['End', project.end_date], ['Deployment', project.deployment_date],
                  ['Warranty End', project.warranty_end], ['Support End', project.support_end], ['Maintenance End', project.maintenance_end],
                ].map(([label, date]) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-700">{date ? new Date(date).toLocaleDateString() : '—'}</p></div>))}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold text-slate-700 mb-3">Milestones</p>
                <div className="space-y-2">{milestones.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                    <p className="text-sm font-medium text-slate-700 flex-1">{m.name}</p>
                    <span className="text-xs text-slate-500">{m.target_date ? new Date(m.target_date).toLocaleDateString() : '—'}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{m.status.replace('_', ' ')}</span>
                  </div>))}</div>
              </div>
            </div>)}

          {/* TASKS */}
          {activeSection === 'tasks' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Tasks & Progress</h3>
              <div className="grid grid-cols-4 gap-3">
                {['todo', 'in_progress', 'review', 'done'].map(s => (
                  <div key={s} className="bg-white rounded-xl border border-slate-200 p-3 text-center"><p className="text-lg font-bold text-slate-800">{tasks.filter(t => t.status === s).length}</p><p className="text-xs text-slate-400 capitalize">{s.replace('_', ' ')}</p></div>))}
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (<div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><ListTree size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No tasks yet.</p></div>) : (
                  tasks.map(task => { const assignee = members.find(m => m.id === task.assigned_to); return (
                    <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <p className="text-sm font-medium text-slate-700 flex-1">{task.title}</p>
                        {assignee && <span className="text-xs text-slate-500">{assignee.full_name}</span>}
                        <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value, task.title)} disabled={isArchived}
                          className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white disabled:opacity-50">
                          {['todo','in_progress','review','done','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      </div>
                      {task.description && <p className="text-xs text-slate-500 mt-2 ml-4">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-2 ml-4">
                        <button onClick={() => setShowTaskUpdate(showTaskUpdate === task.id ? null : task.id)} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Send size={11} /> Add update
                        </button>
                        {task.estimated_hours != null && <span className="text-xs text-slate-400">Est: {task.estimated_hours}h</span>}
                      </div>
                      {showTaskUpdate === task.id && (
                        <div className="mt-2 ml-4 flex gap-2">
                          <input value={taskUpdate} onChange={e => setTaskUpdate(e.target.value)} placeholder="Add a progress update..."
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary" />
                          <button onClick={() => addTaskUpdate(task.id, task.title)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg">Post</button>
                        </div>)}
                    </div>);}))}
              </div>
            </div>)}

          {/* DOCUMENTS */}
          {activeSection === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Documents & Repository</h3>
              {project.git_repo_url && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3"><GitBranch size={18} className="text-slate-500" />
                  <a href={project.git_repo_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex-1">{project.git_repo_url}</a></div>)}
              {documents.length === 0 ? (<div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><FolderOpen size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No documents indexed.</p></div>) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{documents.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">{doc.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{doc.document_type.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 mt-2"><span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{doc.folder}</span>
                      {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Open</a>}</div>
                  </div>))}</div>)}
            </div>)}

          {/* RISKS */}
          {activeSection === 'risks' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Risks & Issues</h3>
              <div className="space-y-3">
                {risks.length === 0 ? (<div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><ShieldAlert size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No risks registered.</p></div>) : (
                  risks.map(r => (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">{r.risk}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Prob: {r.probability}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Impact: {r.impact}</span>
                        <span className="text-xs text-slate-500">{r.status}</span>
                      </div>
                      {r.mitigation && <p className="text-xs text-slate-500 mt-2">Mitigation: {r.mitigation}</p>}
                    </div>)))}
              </div>
              {dependencies.length > 0 && (
                <div className="pt-3 border-t border-slate-200"><p className="text-sm font-semibold text-slate-700 mb-2">Dependencies</p>
                  <div className="space-y-2">{dependencies.map(d => (
                    <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                      <Network size={15} className="text-slate-400" /><p className="text-sm text-slate-700 flex-1">{d.description}</p>
                      <span className="text-xs text-slate-500 capitalize">{d.dependency_type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${d.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                    </div>))}</div></div>)}
            </div>)}

          {/* CHANGE REQUESTS */}
          {activeSection === 'changes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Change Requests</h3>
                {canManage && !isArchived && (
                  <button onClick={() => setShowChangeRequest(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Plus size={14} /> New Change Request
                  </button>)}
              </div>
              {changeRequests.length === 0 ? (<div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><GitCommit size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No change requests.</p></div>) : (
                <div className="space-y-2">{changeRequests.map(cr => (
                  <div key={cr.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between">
                      <div><p className="text-sm font-semibold text-slate-800">{cr.title}</p><p className="text-xs text-slate-500 mt-1">{cr.description}</p></div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : cr.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{cr.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{cr.change_type}</span>
                    </div>
                    {cr.impact_analysis && <p className="text-xs text-slate-500 mt-2"><strong>Impact:</strong> {cr.impact_analysis}</p>}
                    {canManage && cr.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => approveChangeRequest(cr.id, cr.title)} className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
                      </div>)}
                  </div>))}</div>)}
            </div>)}

          {/* COMMUNICATIONS */}
          {activeSection === 'communications' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Communications</h3>
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div><p className="text-xs text-slate-400">Channels</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">{(project.communication_channels || []).map(ch => (
                    <span key={ch} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">{ch}</span>))}</div></div>
                <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Meeting Frequency</p><p className="text-slate-700 capitalize">{project.meeting_frequency}</p></div></div>
                {project.escalation_contacts && project.escalation_contacts.length > 0 && (
                  <div><p className="text-xs text-slate-400">Escalation Contacts</p><p className="text-sm text-slate-700">{project.escalation_contacts.join(', ')}</p></div>)}
              </div>
            </div>)}

          {/* ACTIVITY LOG */}
          {activeSection === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Activity Log</h3>
              {activity.length === 0 ? (<div className="bg-white rounded-xl border border-slate-200 p-8 text-center"><Activity size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">No activity recorded.</p></div>) : (
                <div className="space-y-2">{activity.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Activity size={14} className="text-primary" /></div>
                    <div className="flex-1"><p className="text-sm font-medium text-slate-700">{a.description}</p>
                      <p className="text-xs text-slate-400">{a.actor?.full_name || 'System'} · {new Date(a.created_at).toLocaleString()}</p></div>
                  </div>))}</div>)}
            </div>)}

          {/* ANALYTICS */}
          {activeSection === 'analytics' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Reports & Analytics</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-2xl font-bold text-slate-800">{tasks.length}</p><p className="text-xs text-slate-400">Total Tasks</p></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.status === 'done').length}</p><p className="text-xs text-slate-400">Completed</p></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-2xl font-bold text-blue-600">{phases.length}</p><p className="text-xs text-slate-400">Phases</p></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5"><p className="text-sm font-semibold text-slate-700 mb-2">Requirements Checklist</p>
                {checklist.length === 0 ? (<p className="text-sm text-slate-400">No checklist items.</p>) : (
                  <div className="space-y-1.5">{checklist.map(c => (
                    <button key={c.id} onClick={() => toggleChecklistItem(c.id, c.is_done, c.item)} disabled={isArchived} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-left disabled:opacity-50">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${c.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>{c.is_done && <CheckCircle size={10} className="text-white" />}</div>
                      <span className={`text-sm ${c.is_done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{c.item}</span>
                    </button>))}</div>)}
              </div>
            </div>)}

          {/* ARCHIVE */}
          {activeSection === 'archive' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Archive & Close Project</h3>
              {isArchived ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-2"><Archive size={20} className="text-slate-500" /><p className="text-sm font-semibold text-slate-700">This project is already archived</p></div>
                  <p className="text-sm text-slate-500">Status: <span className={`font-semibold px-2 py-0.5 rounded-full ${statusColors[project.status]}`}>{project.status}</span></p>
                  {canManage && (
                    <button onClick={() => { supabase.from('projects').update({ status: 'active' }).eq('id', project.id).then(() => { logAndReload('project_reopened', `Project reopened by ${profile?.full_name}`); toast.success('Project reopened'); }); }}
                      className="mt-3 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Reopen Project</button>)}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <p className="text-sm text-slate-600">Closing a project will archive it, notify all team members, and log the action. Archived projects are moved out of the active projects list.</p>
                  {canManage && (
                    <div className="flex gap-3">
                      <button onClick={() => setShowCloseConfirm('completed')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                        <CheckCircle size={16} /> Mark as Completed
                      </button>
                      <button onClick={() => setShowCloseConfirm('cancelled')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <X size={16} /> Cancel Project
                      </button>
                    </div>)}
                </div>)}
            </div>)}
        </div>
      </div>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${showCloseConfirm === 'completed' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {showCloseConfirm === 'completed' ? <CheckCircle size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
              </div>
              <div><h3 className="text-base font-bold text-slate-900">{showCloseConfirm === 'completed' ? 'Complete Project' : 'Cancel Project'}</h3>
                <p className="text-xs text-slate-500">This action will archive the project</p></div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {showCloseConfirm === 'completed'
                ? 'This will mark the project as completed, set progress to 100%, notify all team members, and move it to the archived section. Are you sure?'
                : 'This will cancel the project, notify all team members, and move it to the archived section. This cannot be undone from the active list. Are you sure?'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseConfirm(null)} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => closeProject(showCloseConfirm)} disabled={closing}
                className={`flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 ${showCloseConfirm === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {closing ? <Loader2 size={14} className="animate-spin mx-auto" /> : showCloseConfirm === 'completed' ? 'Complete & Archive' : 'Cancel & Archive'}
              </button>
            </div>
          </div>
        </div>)}

      {/* Change Request Modal */}
      {showChangeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5"><h3 className="text-base font-bold text-slate-900">New Change Request</h3>
              <button onClick={() => setShowChangeRequest(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input value={crForm.title} onChange={e => setCrForm({ ...crForm, title: e.target.value })} placeholder="e.g. Add multi-language support"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select value={crForm.change_type} onChange={e => setCrForm({ ...crForm, change_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                  {['scope','timeline','cost','resource','other'].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={crForm.description} onChange={e => setCrForm({ ...crForm, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Impact Analysis</label>
                <textarea value={crForm.impact_analysis} onChange={e => setCrForm({ ...crForm, impact_analysis: e.target.value })} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowChangeRequest(false)} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={createChangeRequest} disabled={!crForm.title.trim()} className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">Submit Request</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
