'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import {
  ArrowLeft, Briefcase, FileText, Building2, DollarSign, Wallet, Users, Calendar,
  ListTree, FolderOpen, TriangleAlert, MessageSquare, Activity, ChartBar as BarChart3,
  Archive, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Plus, Pencil, Trash2,
  X, GitBranch, ShieldAlert, Network, Download, Check, Loader as Loader2, Send,
} from 'lucide-react';

interface ProjectRow {
  id: string; name: string; description: string; status: string; priority: string;
  budget: number; spent: number; progress: number; start_date: string | null;
  end_date: string | null; customer_id: string | null; created_by: string | null;
  project_code?: string; project_type?: string; department?: string;
}

interface TaskRow {
  id: string; title: string; description: string | null; status: string;
  priority: string; assigned_to: string | null; estimated_hours: number | null;
  due_date: string | null; version_id: string | null;
}

interface VersionRow {
  id: string; version_label: string; description: string | null; status: string;
  progress: number | null; is_active: boolean;
}

interface MemberRow { id: string; full_name: string; role: string; }

interface RiskRow {
  id: string; risk: string; probability: string; impact: string; owner: string | null;
  mitigation: string | null; status: string;
}

interface ActivityRow {
  id: string; action: string; description: string | null; actor_id: string | null;
  metadata: Record<string, unknown> | null; created_at: string;
}

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: Briefcase },
  { id: 'tasks', label: 'Tasks Board', icon: ListTree },
  { id: 'versions', label: 'Project Versions', icon: GitBranch },
  { id: 'team', label: 'Team & Assignments', icon: Users },
  { id: 'risks', label: 'Risks & Issues', icon: ShieldAlert },
  { id: 'activity', label: 'Activity Timeline', icon: Activity },
  { id: 'documents', label: 'Documents & Links', icon: FolderOpen },
  { id: 'settings', label: 'Project Settings', icon: Network },
];

const KANBAN_COLS = [
  { key: 'todo', label: 'To Do', color: 'bg-slate-400', bg: 'bg-slate-50' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500', bg: 'bg-blue-50' },
  { key: 'review', label: 'Review', color: 'bg-amber-500', bg: 'bg-amber-50' },
  { key: 'done', label: 'Done', color: 'bg-emerald-500', bg: 'bg-emerald-50' },
];

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
};

async function logActivity(projectId: string, action: string, description: string, actorId: string | null) {
  try {
    await supabase.from('project_activity_log').insert({
      project_id: projectId, action, description, actor_id: actorId, metadata: {},
    });
  } catch { /* non-fatal */ }
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [assignments, setAssignments] = useState<{ id: string; member_id: string; role_in_project: string }[]>([]);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Task modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', estimated_hours: '', due_date: '' });
  const [savingTask, setSavingTask] = useState(false);
  const [showTaskUpdate, setShowTaskUpdate] = useState<string | null>(null);
  const [taskUpdate, setTaskUpdate] = useState('');

  // Version modal state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionForm, setVersionForm] = useState({ version_label: '', description: '', status: 'planning' });
  const [savingVersion, setSavingVersion] = useState(false);

  // Risk modal state
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskForm, setRiskForm] = useState({ risk: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open' });
  const [savingRisk, setSavingRisk] = useState(false);

  // Member modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ member_id: '', role_in_project: 'member' });
  const [savingMember, setSavingMember] = useState(false);

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Edit project state
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', budget: 0, progress: 0, start_date: '', end_date: '' });
  const [savingProject, setSavingProject] = useState(false);

  const canManage = ['admin', 'director', 'manager'].includes(profile?.role || '');
  const isArchived = project?.status === 'completed' || project?.status === 'cancelled';

  const loadAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const [projRes, taskRes, verRes, memRes, asgRes, riskRes, actRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_versions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').order('full_name'),
      supabase.from('project_assignments').select('id, member_id, role_in_project').eq('project_id', projectId),
      supabase.from('project_risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('project_activity_log').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
    ]);

    if (projRes.data) {
      setProject(projRes.data as ProjectRow);
      setEditForm({
        name: projRes.data.name || '', description: projRes.data.description || '',
        status: projRes.data.status || 'planning', priority: projRes.data.priority || 'medium',
        budget: projRes.data.budget || 0, progress: projRes.data.progress || 0,
        start_date: projRes.data.start_date || '', end_date: projRes.data.end_date || '',
      });
    }
    setTasks((taskRes.data as TaskRow[]) || []);
    setVersions((verRes.data as VersionRow[]) || []);
    setMembers((memRes.data as MemberRow[]) || []);
    setAssignments((asgRes.data as { id: string; member_id: string; role_in_project: string }[]) || []);
    setRisks((riskRes.data as RiskRow[]) || []);
    setActivity((actRes.data as ActivityRow[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Real-time subscription for tasks
  useEffect(() => {
    if (!projectId) return;
    const sub = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [projectId, loadAll]);

  // --- Task CRUD ---
  function openNewTask() {
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', estimated_hours: '', due_date: '' });
    setShowTaskModal(true);
  }

  function openEditTask(task: TaskRow) {
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || '', status: task.status,
      priority: task.priority || 'medium', assigned_to: task.assigned_to || '',
      estimated_hours: task.estimated_hours != null ? String(task.estimated_hours) : '',
      due_date: task.due_date || '',
    });
    setShowTaskModal(true);
  }

  async function saveTask() {
    if (!taskForm.title.trim()) { toast.error('Task title is required'); return; }
    setSavingTask(true);
    const payload: Record<string, unknown> = {
      project_id: projectId,
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      status: taskForm.status,
      priority: taskForm.priority,
      assigned_to: taskForm.assigned_to || null,
      estimated_hours: taskForm.estimated_hours ? Number(taskForm.estimated_hours) : null,
      due_date: taskForm.due_date || null,
      version_id: activeVersionId,
    };
    try {
      if (editingTask) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        await logActivity(projectId, 'task_updated', `Task "${taskForm.title}" updated`, profile?.id || null);
        toast.success('Task updated');
      } else {
        const { error } = await supabase.from('tasks').insert({ ...payload, created_by: profile?.id });
        if (error) throw error;
        await logActivity(projectId, 'task_created', `Task "${taskForm.title}" created`, profile?.id || null);
        toast.success('Task created');
      }
      setShowTaskModal(false); setEditingTask(null);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', estimated_hours: '', due_date: '' });
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  }

  async function deleteTask(taskId: string, taskTitle: string) {
    if (!confirm(`Delete task "${taskTitle}"?`)) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { toast.error('Failed to delete task'); return; }
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await logActivity(projectId, 'task_deleted', `Task "${taskTitle}" deleted`, profile?.id || null);
    toast.success('Task deleted');
  }

  async function updateTaskStatus(taskId: string, status: string, taskTitle: string) {
    const completedAt = status === 'done' ? new Date().toISOString() : null;
    const { error } = await supabase.from('tasks').update({ status, completed_at: completedAt }).eq('id', taskId);
    if (error) { toast.error('Failed to update status'); return; }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    await logActivity(projectId, 'task_status_changed', `Task "${taskTitle}" moved to ${status.replace('_', ' ')}`, profile?.id || null);
  }

  async function addTaskUpdate(taskId: string, taskTitle: string) {
    if (!taskUpdate.trim()) return;
    const { error } = await supabase.from('project_activity_log').insert({
      project_id: projectId, action: 'task_update', description: `Update on "${taskTitle}": ${taskUpdate.trim()}`,
      actor_id: profile?.id || null, metadata: { task_id: taskId },
    });
    if (error) { toast.error('Failed to add update'); return; }
    setTaskUpdate(''); setShowTaskUpdate(null);
    toast.success('Update posted');
    loadAll();
  }

  // --- Version CRUD ---
  async function createVersion() {
    if (!versionForm.version_label.trim()) { toast.error('Version label is required'); return; }
    setSavingVersion(true);
    try {
      const { error } = await supabase.from('project_versions').insert({
        project_id: projectId, version_label: versionForm.version_label.trim(),
        description: versionForm.description.trim() || null, status: versionForm.status,
        created_by: profile?.id,
      });
      if (error) throw error;
      await logActivity(projectId, 'version_created', `Version "${versionForm.version_label}" created`, profile?.id || null);
      toast.success('Version created');
      setShowVersionModal(false);
      setVersionForm({ version_label: '', description: '', status: 'planning' });
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create version');
    } finally {
      setSavingVersion(false);
    }
  }

  // --- Risk CRUD ---
  async function saveRisk() {
    if (!riskForm.risk.trim()) { toast.error('Risk description is required'); return; }
    setSavingRisk(true);
    try {
      const { error } = await supabase.from('project_risks').insert({
        project_id: projectId, risk: riskForm.risk.trim(),
        probability: riskForm.probability, impact: riskForm.impact,
        mitigation: riskForm.mitigation.trim() || null, status: riskForm.status,
        owner: profile?.id,
      });
      if (error) throw error;
      await logActivity(projectId, 'risk_added', `Risk "${riskForm.risk}" identified`, profile?.id || null);
      toast.success('Risk added');
      setShowRiskModal(false);
      setRiskForm({ risk: '', probability: 'medium', impact: 'medium', mitigation: '', status: 'open' });
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save risk');
    } finally {
      setSavingRisk(false);
    }
  }

  async function deleteRisk(riskId: string, riskDesc: string) {
    if (!confirm(`Delete risk "${riskDesc}"?`)) return;
    const { error } = await supabase.from('project_risks').delete().eq('id', riskId);
    if (error) { toast.error('Failed to delete risk'); return; }
    setRisks(prev => prev.filter(r => r.id !== riskId));
    toast.success('Risk deleted');
  }

  // --- Member assignment ---
  async function saveMember() {
    if (!memberForm.member_id) { toast.error('Select a team member'); return; }
    setSavingMember(true);
    try {
      const { error } = await supabase.from('project_assignments').insert({
        project_id: projectId, member_id: memberForm.member_id, role_in_project: memberForm.role_in_project,
      });
      if (error) throw error;
      await logActivity(projectId, 'member_added', `Team member assigned to project`, profile?.id || null);
      toast.success('Member assigned');
      setShowMemberModal(false);
      setMemberForm({ member_id: '', role_in_project: 'member' });
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign member');
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(assignmentId: string) {
    if (!confirm('Remove this member from the project?')) return;
    const { error } = await supabase.from('project_assignments').delete().eq('id', assignmentId);
    if (error) { toast.error('Failed to remove member'); return; }
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    toast.success('Member removed');
  }

  // --- Project settings ---
  async function saveProject() {
    if (!editForm.name.trim()) { toast.error('Project name is required'); return; }
    setSavingProject(true);
    try {
      const { error } = await supabase.from('projects').update({
        name: editForm.name.trim(), description: editForm.description.trim() || null,
        status: editForm.status, priority: editForm.priority, budget: Number(editForm.budget) || 0,
        progress: Number(editForm.progress) || 0, start_date: editForm.start_date || null,
        end_date: editForm.end_date || null, updated_at: new Date().toISOString(),
      }).eq('id', projectId);
      if (error) throw error;
      await logActivity(projectId, 'project_updated', `Project details updated`, profile?.id || null);
      toast.success('Project saved');
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save project');
    } finally {
      setSavingProject(false);
    }
  }

  async function archiveProject() {
    if (!confirm('Archive this project? It will be moved to the archived list.')) return;
    const { error } = await supabase.from('projects').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', projectId);
    if (error) { toast.error('Failed to archive project'); return; }
    await logActivity(projectId, 'project_archived', `Project archived`, profile?.id || null);
    toast.success('Project archived');
    loadAll();
  }

  if (loading) {
    return (
      <div>
        <TopBar title="Project Details" subtitle="Loading..." />
        <div className="p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-8 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-2/5" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <TopBar title="Project Not Found" subtitle="" />
        <div className="p-6 text-center">
          <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">This project could not be found or you don&apos;t have access.</p>
          <button onClick={() => router.push('/projects')} className="mt-4 text-sm text-primary hover:underline">Back to Projects</button>
        </div>
      </div>
    );
  }

  const assignedMemberIds = assignments.map(a => a.member_id);
  const availableMembers = members.filter(m => !assignedMemberIds.includes(m.id));

  return (
    <div>
      <TopBar
        title={project.name}
        subtitle={project.project_code ? `Code: ${project.project_code}` : 'Project Details'}
      />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Back link */}
        <button onClick={() => router.push('/projects')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back to Projects
        </button>

        {/* Section tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-1">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeSection === s.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} /> {s.label}
              </button>
            );
          })}
        </div>

        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-slate-900">{project.name}</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[project.status] || 'bg-slate-100'}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  {project.description && <p className="text-sm text-slate-600">{project.description}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Budget</p>
                  <p className="text-lg font-bold text-slate-800">${(project.budget / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Spent</p>
                  <p className="text-lg font-bold text-slate-800">${(project.spent / 1000).toFixed(0)}K</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Progress</p>
                  <p className="text-lg font-bold text-slate-800">{project.progress}%</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Priority</p>
                  <p className="text-lg font-bold capitalize text-slate-800">{project.priority}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Overall Progress</span>
                  <span className="font-semibold text-slate-600">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full">
                  <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  {project.start_date && <div className="flex items-center gap-1.5"><Calendar size={14} /> Start: {new Date(project.start_date).toLocaleDateString()}</div>}
                  {project.end_date && <div className="flex items-center gap-1.5"><Calendar size={14} /> End: {new Date(project.end_date).toLocaleDateString()}</div>}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <ListTree size={20} className="text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-800">{tasks.length}</p>
                <p className="text-xs text-slate-400">Total Tasks</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <CheckCircle size={20} className="text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-800">{tasks.filter(t => t.status === 'done').length}</p>
                <p className="text-xs text-slate-400">Completed</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <Users size={20} className="text-purple-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-800">{assignments.length}</p>
                <p className="text-xs text-slate-400">Team Members</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <GitBranch size={20} className="text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-slate-800">{versions.length}</p>
                <p className="text-xs text-slate-400">Versions</p>
              </div>
            </div>
          </div>
        )}

        {/* TASKS - Kanban Board */}
        {activeSection === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-slate-900">Tasks Board</h3>
              <div className="flex items-center gap-2">
                {versions.length > 0 && (
                  <select
                    value={activeVersionId || ''}
                    onChange={e => setActiveVersionId(e.target.value || null)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                  >
                    <option value="">All versions</option>
                    {versions.map(v => <option key={v.id} value={v.id}>{v.version_label}</option>)}
                  </select>
                )}
                {!isArchived && (
                  <button onClick={openNewTask} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Plus size={14} /> Add Task
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {KANBAN_COLS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.key && (!activeVersionId || t.version_id === activeVersionId));
                return (
                  <div
                    key={col.key}
                    className={`${col.bg} rounded-xl border border-slate-200 p-3 min-h-[200px] transition-all ${dragOverCol === col.key ? 'ring-2 ring-primary' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => {
                      e.preventDefault(); setDragOverCol(null);
                      if (draggedTaskId) {
                        const task = tasks.find(t => t.id === draggedTaskId);
                        if (task && task.status !== col.key) updateTaskStatus(task.id, col.key, task.title);
                      }
                      setDraggedTaskId(null);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col.color}`} />
                        <p className="text-xs font-bold text-slate-700">{col.label}</p>
                      </div>
                      <span className="text-xs font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No tasks</p>
                      ) : colTasks.map(task => {
                        const assignee = members.find(m => m.id === task.assigned_to);
                        return (
                          <div
                            key={task.id}
                            draggable={!isArchived}
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-800 flex-1">{task.title}</p>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditTask(task)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => deleteTask(task.id, task.title)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600" title="Delete">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            {task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>}
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                                {task.priority || 'medium'}
                              </span>
                              {assignee && (
                                <div className="flex items-center gap-1">
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <span className="text-white text-[8px] font-bold">
                                      {assignee.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500">{assignee.full_name?.split(' ')[0]}</span>
                                </div>
                              )}
                            </div>
                            {task.due_date && <p className="text-[10px] text-slate-400 mt-1.5">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
                            {task.estimated_hours != null && <p className="text-[10px] text-slate-400">Est: {task.estimated_hours}h</p>}
                            <button onClick={() => setShowTaskUpdate(showTaskUpdate === task.id ? null : task.id)} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1.5">
                              <Send size={9} /> Add update
                            </button>
                            {showTaskUpdate === task.id && (
                              <div className="mt-1.5 flex gap-1.5">
                                <input value={taskUpdate} onChange={e => setTaskUpdate(e.target.value)} placeholder="Update..."
                                  className="flex-1 px-2 py-1 text-[10px] border border-slate-300 rounded outline-none focus:ring-1 focus:ring-primary" />
                                <button onClick={() => addTaskUpdate(task.id, task.title)} className="px-2 py-1 text-[10px] font-semibold bg-primary text-white rounded">Post</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {tasks.filter(t => t.status === 'blocked').length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-red-600 mb-2">Blocked Tasks</p>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'blocked').map(task => (
                    <div key={task.id} className="bg-red-50 rounded-xl border border-red-200 p-3 flex items-center gap-3">
                      <TriangleAlert size={14} className="text-red-500" />
                      <p className="text-sm font-medium text-slate-700 flex-1">{task.title}</p>
                      <button onClick={() => openEditTask(task)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-slate-600"><Pencil size={12} /></button>
                      <button onClick={() => deleteTask(task.id, task.title)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VERSIONS */}
        {activeSection === 'versions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Project Versions</h3>
              {canManage && !isArchived && (
                <button onClick={() => setShowVersionModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
                  <Plus size={14} /> New Version
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500">Create different versions of this project with separate tasks and details, all under the same project name.</p>
            {versions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <GitBranch size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No versions yet. Create one to manage different versions of this project.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map(v => (
                  <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <GitBranch size={16} className="text-primary" />
                          <p className="text-sm font-semibold text-slate-800">{v.version_label}</p>
                          {v.is_active && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>}
                        </div>
                        {v.description && <p className="text-xs text-slate-500 mt-1">{v.description}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : v.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>
                    {v.progress != null && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400">Progress</span>
                          <span className="text-xs font-semibold text-slate-600">{v.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full">
                          <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${v.progress}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => setActiveVersionId(activeVersionId === v.id ? null : v.id)} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                        {activeVersionId === v.id ? 'Filtering tasks' : 'Filter tasks'}
                      </button>
                      <span className="text-xs text-slate-400">{tasks.filter(t => t.version_id === v.id).length} tasks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAM */}
        {activeSection === 'team' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Team & Assignments</h3>
              {canManage && !isArchived && availableMembers.length > 0 && (
                <button onClick={() => setShowMemberModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
                  <Plus size={14} /> Assign Member
                </button>
              )}
            </div>
            {assignments.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Users size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No team members assigned yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {assignments.map(a => {
                  const member = members.find(m => m.id === a.member_id);
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{member?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{member?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400 capitalize">{a.role_in_project}</p>
                      </div>
                      {canManage && !isArchived && (
                        <button onClick={() => removeMember(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RISKS */}
        {activeSection === 'risks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Risks & Issues</h3>
              {canManage && !isArchived && (
                <button onClick={() => setShowRiskModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary/90">
                  <Plus size={14} /> Add Risk
                </button>
              )}
            </div>
            {risks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <ShieldAlert size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No risks identified yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {risks.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{r.risk}</p>
                        {r.mitigation && <p className="text-xs text-slate-500 mt-1">Mitigation: {r.mitigation}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status}</span>
                        <span className="text-xs text-slate-400">P: {r.probability} / I: {r.impact}</span>
                        {canManage && !isArchived && (
                          <button onClick={() => deleteRisk(r.id, r.risk)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY */}
        {activeSection === 'activity' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Activity Timeline</h3>
            {activity.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Activity size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {activity.map(a => {
                  const actor = members.find(m => m.id === a.actor_id);
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Activity size={14} className="text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{a.description || a.action}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {actor?.full_name || 'System'} · {new Date(a.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DOCUMENTS */}
        {activeSection === 'documents' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Documents & Links</h3>
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <FolderOpen size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Document management will appear here. Link repositories, wikis, and files related to this project.</p>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && canManage && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Project Settings</h3>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Project Name *</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Budget ($)</label>
                  <input type="number" value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Progress (%)</label>
                  <input type="number" min="0" max="100" value={editForm.progress} onChange={e => setEditForm({ ...editForm, progress: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                  <input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveProject} disabled={savingProject}
                  className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                  {savingProject ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Changes'}
                </button>
                {!isArchived && (
                  <button onClick={archiveProject} className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5">
                    <Archive size={14} /> Archive
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && !canManage && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-500">You need manager or admin access to edit project settings.</p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">{editingTask ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['todo','in_progress','review','done','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Assign To</label>
                  <select value={taskForm.assigned_to} onChange={e => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estimated Hours</label>
                <input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
              {activeVersionId && (
                <p className="text-xs text-slate-400">This task will be added to version: {versions.find(v => v.id === activeVersionId)?.version_label}</p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowTaskModal(false); setEditingTask(null); }} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveTask} disabled={savingTask || !taskForm.title.trim()} className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {savingTask ? <Loader2 size={14} className="animate-spin mx-auto" /> : editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">New Project Version</h3>
              <button onClick={() => setShowVersionModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Version Label *</label>
                <input value={versionForm.version_label} onChange={e => setVersionForm({ ...versionForm, version_label: e.target.value })} placeholder="e.g. v2.0, Phase 2, Alternative"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={versionForm.description} onChange={e => setVersionForm({ ...versionForm, description: e.target.value })} rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={versionForm.status} onChange={e => setVersionForm({ ...versionForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                  {['planning','active','on_hold','completed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowVersionModal(false)} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={createVersion} disabled={savingVersion || !versionForm.version_label.trim()} className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {savingVersion ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Create Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">Add Risk</h3>
              <button onClick={() => setShowRiskModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Risk Description *</label>
                <input value={riskForm.risk} onChange={e => setRiskForm({ ...riskForm, risk: e.target.value })} placeholder="Describe the risk..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Probability</label>
                  <select value={riskForm.probability} onChange={e => setRiskForm({ ...riskForm, probability: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Impact</label>
                  <select value={riskForm.impact} onChange={e => setRiskForm({ ...riskForm, impact: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                    {['low','medium','high','critical'].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mitigation Plan</label>
                <textarea value={riskForm.mitigation} onChange={e => setRiskForm({ ...riskForm, mitigation: e.target.value })} rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowRiskModal(false)} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveRisk} disabled={savingRisk || !riskForm.risk.trim()} className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {savingRisk ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Add Risk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">Assign Team Member</h3>
              <button onClick={() => setShowMemberModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Team Member *</label>
                <select value={memberForm.member_id} onChange={e => setMemberForm({ ...memberForm, member_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                  <option value="">Select a member...</option>
                  {availableMembers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.role.replace('_', ' ')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role in Project</label>
                <select value={memberForm.role_in_project} onChange={e => setMemberForm({ ...memberForm, role_in_project: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
                  {['lead','member','contributor','observer'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMemberModal(false)} className="flex-1 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveMember} disabled={savingMember || !memberForm.member_id} className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {savingMember ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Assign Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
