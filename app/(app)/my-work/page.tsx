'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, CircleCheck as CheckCircle2, Loader as Loader2, TriangleAlert as AlertTriangle, Plus, Pencil, Trash2, CalendarClock, FolderKanban, Repeat, StickyNote, CircleArrowRight as ArrowRightCircle, CircleAlert as AlertCircle, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: Priority;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
}

interface RecurringTask {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  next_due_date: string | null;
  is_active: boolean;
  assigned_to: string | null;
  created_at: string;
}

const COLUMNS: { key: TaskStatus; label: string; color: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { key: 'review', label: 'Review', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { key: 'done', label: 'Done', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; badge: string }> = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Medium', badge: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', badge: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', badge: 'bg-red-100 text-red-700' },
};

const STATUS_TO_COL: Record<string, TaskStatus> = {
  todo: 'todo',
  started: 'in_progress',
  in_progress: 'in_progress',
  review: 'review',
  done: 'done',
  blocked: 'todo',
  cancelled: 'todo',
};

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === 'done') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const emptyForm = {
  title: '',
  project_id: '',
  status: 'todo' as TaskStatus,
  priority: 'medium' as Priority,
  due_date: '',
  description: '',
};

export default function MyWorkPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadAll = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, recurRes, projRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, project:projects!tasks_project_id_fkey(id, name)')
          .eq('assigned_to', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('recurring_tasks')
          .select('*')
          .eq('assigned_to', profile.id)
          .order('next_due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('project_assignments')
          .select('project:projects!project_assignments_project_id_fkey(id, name)')
          .eq('member_id', profile.id),
      ]);

      if (taskRes.error) throw taskRes.error;
      if (recurRes.error) throw recurRes.error;
      if (projRes.error) throw projRes.error;

      setTasks((taskRes.data as Task[]) || []);
      setRecurringTasks((recurRes.data as RecurringTask[]) || []);
      const projList = (projRes.data || [])
        .map((p: any) => p.project)
        .filter(Boolean) as { id: string; name: string }[];
      setProjects(projList);
    } catch (err: any) {
      console.error('Error fetching my work:', err);
      setError(err?.message || 'Failed to load your work');
      toast.error('Failed to load your work');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openCreate() {
    setEditingTask(null);
    setForm({ ...emptyForm });
    setShowTaskDialog(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      project_id: task.project_id || '',
      status: STATUS_TO_COL[task.status] || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      description: task.description || '',
    });
    setShowTaskDialog(true);
  }

  async function handleSaveTask() {
    if (!profile?.id) return;
    if (!form.title.trim()) {
      toast.error('Task title is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        project_id: form.project_id || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        description: form.description.trim() || null,
        assigned_to: profile.id,
        completed_at: form.status === 'done' ? new Date().toISOString() : null,
      };

      if (editingTask) {
        const { error: upErr } = await supabase
          .from('tasks')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingTask.id);
        if (upErr) throw upErr;
        toast.success('Task updated');
      } else {
        const { error: inErr } = await supabase
          .from('tasks')
          .insert({ ...payload, created_by: profile.id });
        if (inErr) throw inErr;
        toast.success('Task created');
      }
      setShowTaskDialog(false);
      setEditingTask(null);
      setForm({ ...emptyForm });
      await loadAll();
    } catch (err: any) {
      console.error('Error saving task:', err);
      toast.error(err?.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      const { error: delErr } = await supabase.from('tasks').delete().eq('id', task.id);
      if (delErr) throw delErr;
      toast.success('Task deleted');
      if (detailTask?.id === task.id) {
        setShowDetailDialog(false);
        setDetailTask(null);
      }
      await loadAll();
    } catch (err: any) {
      console.error('Error deleting task:', err);
      toast.error(err?.message || 'Failed to delete task');
    }
  }

  async function handleMoveStatus(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    try {
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null;
      const { error: mvErr } = await supabase
        .from('tasks')
        .update({ status: newStatus, completed_at: completedAt, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (mvErr) throw mvErr;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, completed_at: completedAt } : t)));
      if (detailTask?.id === taskId) setDetailTask((d) => (d ? { ...d, status: newStatus, completed_at: completedAt } : d));
      toast.success(`Moved to ${COLUMNS.find((c) => c.key === newStatus)?.label}`);
    } catch (err: any) {
      console.error('Error moving task:', err);
      toast.error('Failed to update status');
    }
  }

  async function handleMarkComplete(taskId: string) {
    await handleMoveStatus(taskId, 'done');
  }

  function openDetail(task: Task) {
    setDetailTask(task);
    setNoteText(task.description || '');
    setShowDetailDialog(true);
  }

  async function handleSaveNote() {
    if (!detailTask) return;
    setSavingNote(true);
    try {
      const { error: noteErr } = await supabase
        .from('tasks')
        .update({ description: noteText.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', detailTask.id);
      if (noteErr) throw noteErr;
      setTasks((prev) => prev.map((t) => (t.id === detailTask.id ? { ...t, description: noteText.trim() || null } : t)));
      setDetailTask((d) => (d ? { ...d, description: noteText.trim() || null } : d));
      toast.success('Notes saved');
    } catch (err: any) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleToggleRecurring(rt: RecurringTask) {
    try {
      const { error: togErr } = await supabase
        .from('recurring_tasks')
        .update({ is_active: !rt.is_active })
        .eq('id', rt.id);
      if (togErr) throw togErr;
      setRecurringTasks((prev) => prev.map((r) => (r.id === rt.id ? { ...r, is_active: !r.is_active } : r)));
      toast.success(rt.is_active ? 'Recurring task paused' : 'Recurring task resumed');
    } catch (err: any) {
      console.error('Error toggling recurring task:', err);
      toast.error('Failed to update recurring task');
    }
  }

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress' || t.status === 'started').length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const byColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], review: [], done: [] };
    tasks.forEach((t) => {
      const col = STATUS_TO_COL[t.status] || 'todo';
      map[col].push(t);
    });
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div>
        <TopBar title="My Work" subtitle="Your assigned tasks and recurring work" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="My Work" subtitle="Your assigned tasks and recurring work" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assigned</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <ClipboardList className="h-4 w-4 mr-1 text-blue-600" /> All tasks
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" /> Done
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <Loader2 className="h-4 w-4 mr-1 text-blue-600" /> Active work
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Overdue</CardDescription>
              <CardTitle className="text-2xl">{stats.overdue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <AlertTriangle className="h-4 w-4 mr-1 text-red-600" /> Past due date
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error banner */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <Button variant="outline" size="sm" onClick={loadAll}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Task Board</h2>
            <p className="text-sm text-slate-500">{tasks.length} tasks assigned to you</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>

        {/* Board */}
        {tasks.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-1">No tasks assigned to you</p>
              <p className="text-sm text-slate-400 mb-4">Create a task or ask a project manager to assign one</p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = byColumn[col.key];
              return (
                <div key={col.key} className="rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                  <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                      <span className="font-semibold text-sm text-slate-700">{col.label}</span>
                      <Badge variant="secondary" className="h-5 text-xs">
                        {items.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 space-y-2 min-h-[120px]">
                    {items.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400">No tasks</div>
                    ) : (
                      items.map((task) => {
                        const overdue = isOverdue(task.due_date, task.status);
                        const prio = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                        return (
                          <div
                            key={task.id}
                            className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                            onClick={() => openDetail(task)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="font-medium text-sm text-slate-800 line-clamp-2">{task.title}</p>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEdit(task);
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task);
                                  }}
                                  className="p-1 rounded hover:bg-red-50 text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {task.project?.name && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                <FolderKanban className="h-3 w-3" />
                                <span className="truncate">{task.project.name}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className={`text-xs ${prio.badge} border-0`}>
                                {prio.label}
                              </Badge>
                              <span
                                className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}
                              >
                                <CalendarClock className="h-3 w-3" />
                                {formatDate(task.due_date)}
                                {overdue && ' · Overdue'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recurring tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold text-slate-900">My Recurring Tasks</h2>
            <Badge variant="secondary">{recurringTasks.length}</Badge>
          </div>
          {recurringTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Repeat className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No recurring tasks assigned to you</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {recurringTasks.map((rt) => (
                <Card key={rt.id} className={rt.is_active ? '' : 'opacity-60'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{rt.title}</CardTitle>
                      <Badge variant={rt.is_active ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                        {rt.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Repeat className="h-3 w-3" />
                      {rt.frequency || 'Recurring'}
                      {rt.next_due_date && (
                        <span className="flex items-center gap-1 ml-2">
                          <CalendarClock className="h-3 w-3" />
                          Next: {formatDate(rt.next_due_date)}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {rt.description && (
                    <CardContent className="pt-0 pb-3">
                      <p className="text-sm text-slate-600 line-clamp-2">{rt.description}</p>
                    </CardContent>
                  )}
                  <CardContent className="pt-0">
                    <Button size="sm" variant="outline" onClick={() => handleToggleRecurring(rt)}>
                      {rt.is_active ? 'Pause' : 'Resume'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create / Edit dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update the details of this task' : 'Create a new personal task'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Review Q3 deliverables"
                />
              </div>
              <div>
                <Label>Project (optional)</Label>
                <Select
                  value={form.project_id || '__none'}
                  onValueChange={(v) => setForm({ ...form, project_id: v === '__none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="task-due">Due Date</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTaskDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveTask} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{detailTask?.title}</DialogTitle>
              <DialogDescription>
                {detailTask?.project?.name ? `In ${detailTask.project.name}` : 'Personal task'}
              </DialogDescription>
            </DialogHeader>

            {detailTask && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={PRIORITY_CONFIG[detailTask.priority]?.badge + ' border-0'}>
                    {PRIORITY_CONFIG[detailTask.priority]?.label || 'Medium'} priority
                  </Badge>
                  {isOverdue(detailTask.due_date, detailTask.status) && (
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-0">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
                    </Badge>
                  )}
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Due {formatDate(detailTask.due_date)}
                  </span>
                </div>

                {/* Status mover */}
                <div>
                  <Label className="mb-2 block">Update Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLUMNS.map((c) => (
                      <Button
                        key={c.key}
                        size="sm"
                        variant={STATUS_TO_COL[detailTask.status] === c.key ? 'default' : 'outline'}
                        onClick={() => handleMoveStatus(detailTask.id, c.key)}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.dot} mr-1.5`} />
                        {c.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {detailTask.status !== 'done' && (
                  <Button className="w-full" variant="default" onClick={() => handleMarkComplete(detailTask.id)}>
                    <Check className="mr-2 h-4 w-4" /> Mark as Complete
                  </Button>
                )}

                {/* Notes */}
                <div className="border-t border-slate-200 pt-4">
                  <Label htmlFor="task-notes" className="mb-2 block flex items-center gap-1.5">
                    <StickyNote className="h-4 w-4" /> Notes
                  </Label>
                  <Textarea
                    id="task-notes"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add notes about this task..."
                    rows={4}
                  />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={handleSaveNote} disabled={savingNote}>
                      {savingNote && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Save Notes
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (detailTask) openEdit(detailTask);
                  setShowDetailDialog(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                <ArrowRightCircle className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
