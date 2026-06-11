'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import Skeleton from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import { useRouter } from 'next/navigation';

import type {
  Project,
  Profile,
  ProjectFeatureLink,
  ProjectFeatureLinkType,
  ProjectIntegration,
  ProjectIntegrationAuthType,
  TaskSubtask,
} from '@/lib/database.types';

import { createProjectIntegration, fetchProjectIntegrations } from '@/lib/integrations';
import { logAudit } from '@/lib/audit';
import { parseISO } from 'date-fns';

type CreateProjectMode = 'manual' | 'template' | 'import';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const emptyForm = (): Partial<Project> => ({
  name: '',
  description: '',
  status: 'planning',
  priority: 'medium',
  budget: 0,
  spent: 0,
  progress: 0,
});

export default function ProjectsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const sb = supabase; // ✅ SAFE SINGLE SOURCE

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [createMode, setCreateMode] = useState<CreateProjectMode>('manual');
  const [saving, setSaving] = useState(false);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, TaskSubtask[]>>({});

  const canManage = ['admin', 'director', 'manager'].includes(profile?.role || '');

  // ---------------- LOAD PROJECTS ----------------
  const loadProjects = async () => {
    if (!sb) return;

    setLoading(true);

    const { data } = await sb
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    setProjects((data as Project[]) || []);
    setLoading(false);
  };

  // ---------------- LOAD TASKS ----------------
  const loadTasks = async (projectId: string) => {
    if (!sb) return;

    const { data } = await sb
      .from('tasks')
      .select('*, profiles(full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const list = data || [];
    setTasks(list);

    const ids = list.map((t: any) => t.id);

    if (ids.length === 0) {
      setSubtasksByTaskId({});
      return;
    }

    const { data: subs } = await sb
      .from('task_subtasks')
      .select('*')
      .in('task_id', ids);

    const map: Record<string, TaskSubtask[]> = {};

    (subs as TaskSubtask[] | null)?.forEach((s) => {
      if (!map[s.task_id]) map[s.task_id] = [];
      map[s.task_id].push(s);
    });

    setSubtasksByTaskId(map);
  };

  // ---------------- INIT ----------------
  useEffect(() => {
    loadProjects();

    sb?.from('profiles')
      .select('*')
      .then((result: any) => setMembers((result.data as Profile[]) || []));
  }, []);

  // ---------------- CREATE PROJECT ----------------
  const handleCreateProject = async () => {
    if (!sb || !form.name?.trim()) return;

    setSaving(true);

    await sb.from('projects').insert({
      ...form,
      created_by: profile?.id,
    });

    await loadProjects();

    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  };

  const [form, setForm] = useState(emptyForm());

  // ---------------- STATUS UPDATE ----------------
  const handleStatusUpdate = async (id: string, status: Project['status']) => {
    if (!sb) return;

    await sb.from('projects').update({ status }).eq('id', id);

    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );

    if (selectedProject?.id === id) {
      setSelectedProject((prev) => (prev ? { ...prev, status } : null));
    }
  };

  // ---------------- FILTER ----------------
  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ---------------- SAFETY CHECK ----------------
  if (!sb) {
    return (
      <div className="p-6 text-red-500">
        Supabase is not configured.
      </div>
    );
  }

  // ---------------- UI ----------------
  return (
    <div>
      <TopBar title="Projects" subtitle={`${projects.length} projects`} />

      <div className="p-6 space-y-5">

        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="px-3 py-2 border rounded"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="all">All</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {canManage && (
            <button
              onClick={() => router.push('/projects/new')}
              className="px-4 py-2 bg-black text-white rounded"
            >
              New Project
            </button>
          )}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border p-3 rounded">
                <Skeleton lines={2} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started."
            action={
              canManage && (
                <button onClick={() => router.push('/projects/new')} className="px-4 py-2 bg-black text-white rounded">
                  New Project
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="border p-4 rounded cursor-pointer hover:shadow-sm"
                onClick={() => {
                  setSelectedProject(p);
                  loadTasks(p.id);
                }}
              >
                <div className="font-semibold text-base truncate">{p.name}</div>
                <div className="text-sm text-gray-500 mt-2 line-clamp-3">
                  {p.description}
                </div>
                <div className="text-xs mt-3">{p.status}</div>

                {canManage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(p.id, 'active');
                    }}
                    className="text-xs text-blue-600 mt-2"
                  >
                    Mark Active
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}