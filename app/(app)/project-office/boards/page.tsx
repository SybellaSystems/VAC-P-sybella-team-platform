'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { queueOfflineAction } from '@/lib/offline';
import { TopBar } from '@/components/layout/TopBar';
import { LayoutGrid, CalendarDays } from 'lucide-react';
import type { Project, Task } from '@/lib/database.types';

const STATUS_ORDER: Array<Task['status']> = ['todo', 'started', 'in_progress', 'review', 'blocked', 'done', 'cancelled'];
const VIEW_OPTIONS = ['kanban', 'calendar', 'gantt'] as const;

type BoardView = (typeof VIEW_OPTIONS)[number];

function statusLabel(status: Task['status']) {
  switch (status) {
    case 'todo': return 'To do';
    case 'started': return 'Started';
    case 'in_progress': return 'In progress';
    case 'review': return 'Review';
    case 'blocked': return 'Blocked';
    case 'done': return 'Done';
    case 'cancelled': return 'Cancelled';
    default: return 'Unknown';
  }
}

export default function ProjectBoardPage() {
  useDocumentTitle('Project boards | VAC-P');
  const { profile } = useAuth();
  const { queue, syncing, lastSyncedAt, attemptSync } = useOfflineSync();
  const [view, setView] = useState<BoardView>('kanban');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const projectOptions = useMemo(() => projects.map((project) => ({ id: project.id, name: project.name })), [projects]);
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId]);
  const filteredTasks = useMemo(
    () => tasks.filter((task) => (selectedProjectId ? task.project_id === selectedProjectId : true)),
    [tasks, selectedProjectId],
  );
  const groupedTasks = useMemo(
    () => STATUS_ORDER.reduce<Record<Task['status'], Task[]>>((acc, status) => {
      acc[status] = filteredTasks.filter((task) => task.status === status);
      return acc;
    }, {} as Record<Task['status'], Task[]>),
    [filteredTasks],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: projectData }, { data: taskData }] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: true }).limit(50),
        supabase.from('tasks').select('*').order('due_date', { ascending: true }).limit(200),
      ]);

      setProjects((projectData as Project[]) ?? []);
      setTasks((taskData as Task[]) ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  const changeTaskStatus = async (taskId: string, nextStatus: Task['status']) => {
    const payload = { id: taskId, fields: { status: nextStatus } };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineAction({ type: 'updateTask', payload });
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
      return;
    }

    const response = await supabase.from('tasks').update({ status: nextStatus }).eq('id', taskId);
    if (response.error) {
      queueOfflineAction({ type: 'updateTask', payload });
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
      return;
    }

    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
  };

  return (
    <div className="min-h-full">
      <TopBar title="Project boards" subtitle="Kanban, calendar, and timeline views" />
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <section className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Choose a board view and filter by project to manage delivery work visually.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {VIEW_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setView(option)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold ${view === option ? 'border-primary bg-primary text-white' : 'border-border bg-white text-slate-700'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>Project filter</span>
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(event) => setSelectedProjectId(event.target.value || null)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">All projects</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LayoutGrid size={18} />
                  <span>Board summary</span>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600">{view}</span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                <p>Projects: {projects.length}</p>
                <p>Tasks in view: {filteredTasks.length}</p>
                <p>Pending offline actions: {queue.length}</p>
                <p>{syncing ? 'Syncing queued updates…' : lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : 'No sync yet'}</p>
              </div>
              <button
                type="button"
                onClick={() => void attemptSync()}
                className="mt-4 w-full rounded-2xl border border-border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Sync offline work
              </button>
            </div>
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays size={18} />
                <span>Next milestones</span>
              </div>
              <div className="mt-4 space-y-3">
                {filteredTasks.filter((task) => task.due_date).slice(0, 4).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-border p-3">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">Due {task.due_date?.slice(0, 10)}</p>
                  </div>
                ))}
                {!filteredTasks.filter((task) => task.due_date).length && <p className="text-sm text-muted-foreground">No upcoming due dates available.</p>}
              </div>
            </div>
          </aside>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading board data…</p>
          ) : view === 'kanban' ? (
            <div className="grid gap-4 xl:grid-cols-5">
              {STATUS_ORDER.map((status) => (
                <div key={status} className="space-y-3 rounded-3xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{statusLabel(status)}</h3>
                  <div className="space-y-3">
                    {groupedTasks[status].map((task) => (
                      <div key={task.id} className="rounded-2xl border border-border bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{task.project_id === selectedProjectId ? selectedProject?.name : projects.find((project) => project.id === task.project_id)?.name}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{task.due_date ? `Due ${task.due_date.slice(0, 10)}` : 'No due date'}</span>
                          <button
                            type="button"
                            onClick={() => changeTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                            className="rounded-full bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary"
                          >
                            Toggle done
                          </button>
                        </div>
                      </div>
                    ))}
                    {!groupedTasks[status].length && <p className="text-xs text-muted-foreground">No tasks</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : view === 'calendar' ? (
            <div className="space-y-4">
              {['Today', 'This week', 'Later'].map((section) => (
                <div key={section} className="rounded-3xl border border-border bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">{section}</h3>
                  <div className="mt-3 grid gap-3">
                    {filteredTasks.filter((task) => task.status !== 'done').slice(0, 5).map((task) => (
                      <div key={task.id} className="rounded-2xl border border-border bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-sm">{task.title}</p>
                          <span className="text-xs text-muted-foreground">{task.due_date ? task.due_date.slice(0, 10) : 'TBD'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{statusLabel(task.status)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-slate-50 p-4">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <div className="mt-4 space-y-3">
                  {filteredTasks.filter((task) => task.due_date).map((task) => (
                    <div key={task.id} className="rounded-2xl border border-border bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{statusLabel(task.status)}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{task.due_date ? task.due_date.slice(0, 10) : 'TBD'}</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-primary" style={{ width: '24%' }} />
                      </div>
                    </div>
                  ))}
                  {!filteredTasks.filter((task) => task.due_date).length && <p className="text-sm text-muted-foreground">No timeline entries yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
