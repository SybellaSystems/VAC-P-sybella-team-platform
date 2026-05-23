'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Search, Calendar, DollarSign, ChevronRight, Kanban, List, X, Link2 } from 'lucide-react';
import { parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700',
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
};

const priorityColors: Record<string, string> = {
  low: 'text-emerald-600',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

const emptyForm = (): Partial<Project> => ({
  name: '', description: '', status: 'planning', priority: 'medium',
  budget: 0, spent: 0, progress: 0,
});

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [subtasksByTaskId, setSubtasksByTaskId] = useState<Record<string, TaskSubtask[]>>({});
  const [featureLinks, setFeatureLinks] = useState<ProjectFeatureLink[]>([]);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [linkPickType, setLinkPickType] = useState<ProjectFeatureLinkType>('customer');
  const [linkPickId, setLinkPickId] = useState('');
  const [pickCustomers, setPickCustomers] = useState<{ id: string; name: string }[]>([]);
  const [pickBudgets, setPickBudgets] = useState<{ id: string; title: string }[]>([]);
  const [pickWiki, setPickWiki] = useState<{ id: string; title: string }[]>([]);
  const [pickRepos, setPickRepos] = useState<{ id: string; title: string }[]>([]);
  const [pickFinance, setPickFinance] = useState<{ id: string; title: string }[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([]);
  const [liveIntegrationData, setLiveIntegrationData] = useState<Record<string, any> | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationForm, setIntegrationForm] = useState<{
    platform: string;
    endpoint: string;
    auth_type: ProjectIntegrationAuthType;
    apiKey: string;
    bearerToken: string;
    username: string;
    password: string;
  }>({
    platform: '',
    endpoint: '',
    auth_type: 'none',
    apiKey: '',
    bearerToken: '',
    username: '',
    password: '',
  });

  const canManage = ['admin','director','manager'].includes(profile?.role || '');

  useEffect(() => {
    loadProjects();
    supabase.from('profiles').select('*').then(({ data }) => setMembers((data as Profile[]) || []));
  }, []);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects((data as Project[]) || []);
    setLoading(false);
  };

  const loadTasks = async (projectId: string) => {
    const { data } = await supabase.from('tasks').select('*, profiles(full_name)').eq('project_id', projectId).order('created_at', { ascending: false });
    const list = data || [];
    setTasks(list);
    const ids = list.map((t: { id: string }) => t.id);
    if (ids.length === 0) {
      setSubtasksByTaskId({});
      return;
    }
    const { data: subs } = await supabase.from('task_subtasks').select('*').in('task_id', ids);
    const map: Record<string, TaskSubtask[]> = {};
    (subs as TaskSubtask[] | null)?.forEach((s) => {
      if (!map[s.task_id]) map[s.task_id] = [];
      map[s.task_id].push(s);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
    });
    setSubtasksByTaskId(map);
  };

  const loadFeatureLinks = async (projectId: string) => {
    const { data } = await supabase.from('project_feature_links').select('*').eq('project_id', projectId);
    const links = (data as ProjectFeatureLink[]) || [];
    setFeatureLinks(links);
    const labels: Record<string, string> = {};
    const buckets: Record<ProjectFeatureLinkType, string[]> = {
      customer: [],
      financial_record: [],
      budget_proposal: [],
      wiki_page: [],
      repo_link: [],
    };
    links.forEach((l) => buckets[l.feature_type].push(l.feature_id));
    const uniq = (xs: string[]) => Array.from(new Set(xs));
    if (buckets.customer.length) {
      const { data: rows } = await supabase.from('customers').select('id,name').in('id', uniq(buckets.customer));
      rows?.forEach((r: { id: string; name: string }) => {
        labels[`customer:${r.id}`] = r.name;
      });
    }
    if (buckets.financial_record.length) {
      const { data: rows } = await supabase.from('financial_records').select('id,title').in('id', uniq(buckets.financial_record));
      rows?.forEach((r: { id: string; title: string }) => {
        labels[`financial_record:${r.id}`] = r.title;
      });
    }
    if (buckets.budget_proposal.length) {
      const { data: rows } = await supabase.from('budget_proposals').select('id,title').in('id', uniq(buckets.budget_proposal));
      rows?.forEach((r: { id: string; title: string }) => {
        labels[`budget_proposal:${r.id}`] = r.title;
      });
    }
    if (buckets.wiki_page.length) {
      const { data: rows } = await supabase.from('wiki_pages').select('id,title').in('id', uniq(buckets.wiki_page));
      rows?.forEach((r: { id: string; title: string }) => {
        labels[`wiki_page:${r.id}`] = r.title;
      });
    }
    if (buckets.repo_link.length) {
      const { data: rows } = await supabase.from('repo_links').select('id,title').in('id', uniq(buckets.repo_link));
      rows?.forEach((r: { id: string; title: string }) => {
        labels[`repo_link:${r.id}`] = r.title;
      });
    }
    setLinkLabels(labels);
  };

  const loadIntegrations = async (projectId: string) => {
    const { data, error } = await fetchProjectIntegrations(projectId);
    if (error) {
      return;
    }
    setIntegrations((data as ProjectIntegration[]) || []);
  };

  const loadLiveIntegrationData = async (projectId: string) => {
    if (!projectId) return;
    setIntegrationLoading(true);
    try {
      const response = await fetch(`/api/integrations/project/${projectId}?live=true`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load live integration data.');
      }
      setLiveIntegrationData(payload.integrations?.[0]?.live_data ?? null);
    } catch {
      setLiveIntegrationData(null);
    } finally {
      setIntegrationLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProject) {
      setFeatureLinks([]);
      setLinkLabels({});
      setIntegrations([]);
      setLiveIntegrationData(null);
      return;
    }
    loadFeatureLinks(selectedProject.id);
    loadIntegrations(selectedProject.id);
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject || !canManage) return;
    let cancelled = false;
    (async () => {
      const [cust, bp, wiki, repo, fin] = await Promise.all([
        supabase.from('customers').select('id,name').order('name'),
        supabase.from('budget_proposals').select('id,title').order('created_at', { ascending: false }).limit(80),
        supabase.from('wiki_pages').select('id,title').order('title').limit(80),
        supabase.from('repo_links').select('id,title').order('title').limit(80),
        supabase.from('financial_records').select('id,title').order('created_at', { ascending: false }).limit(80),
      ]);
      if (cancelled) return;
      setPickCustomers((cust.data as { id: string; name: string }[]) || []);
      setPickBudgets((bp.data as { id: string; title: string }[]) || []);
      setPickWiki((wiki.data as { id: string; title: string }[]) || []);
      setPickRepos((repo.data as { id: string; title: string }[]) || []);
      setPickFinance((fin.data as { id: string; title: string }[]) || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id, canManage]);

  const timelineRange = () => {
    const timelineTasks = tasks.filter((t: any) => t.created_at);
    if (timelineTasks.length === 0) return null;
    const times = timelineTasks.flatMap((t: any) => {
      const start = t.created_at ? parseISO(t.created_at).getTime() : Date.now();
      const end = t.due_date ? parseISO(t.due_date).getTime() : start + 86400000;
      return [start, end];
    });
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const span = Math.max(tMax - tMin, 86400000);
    return { tMin, span };
  };

  const addFeatureLink = async () => {
    if (!selectedProject?.id || !linkPickId.trim()) return;
    await supabase.from('project_feature_links').insert({
      project_id: selectedProject.id,
      feature_type: linkPickType,
      feature_id: linkPickId.trim(),
      created_by: profile?.id ?? null,
    });
    await loadFeatureLinks(selectedProject.id);
    await logAudit({
      event_type: 'project.feature_link',
      entity_type: 'project',
      entity_id: selectedProject.id,
      action: 'create',
      details: `${linkPickType}:${linkPickId}`,
    });
    setLinkPickId('');
  };

  const addIntegration = async () => {
    if (!selectedProject?.id || !integrationForm.platform.trim() || !integrationForm.endpoint.trim()) return;
    const { data, error } = await createProjectIntegration({
      project_id: selectedProject.id,
      platform: integrationForm.platform.trim(),
      endpoint: integrationForm.endpoint.trim(),
      auth_type: integrationForm.auth_type,
      credentials: {
        apiKey: integrationForm.apiKey.trim() || undefined,
        bearerToken: integrationForm.bearerToken.trim() || undefined,
        username: integrationForm.username.trim() || undefined,
        password: integrationForm.password.trim() || undefined,
      },
      created_by: profile?.id ?? null,
    });

    if (!error) {
      setIntegrations((prev) => [...prev, (data as ProjectIntegration[])[0]]);
      setIntegrationForm({ platform: '', endpoint: '', auth_type: 'none', apiKey: '', bearerToken: '', username: '', password: '' });
      await logAudit({
        event_type: 'project.integration_created',
        entity_type: 'project',
        entity_id: selectedProject.id,
        action: 'create',
        details: `platform=${integrationForm.platform}`,
      });
    }
  };

  const addSubtaskForTask = async (taskId: string) => {
    const title = (subtaskDraft[taskId] || '').trim();
    if (!title || !selectedProject) return;
    const ord = (subtasksByTaskId[taskId]?.length ?? 0);
    await supabase.from('task_subtasks').insert({
      task_id: taskId,
      title,
      sort_order: ord,
      status: 'todo',
    });
    setSubtaskDraft((prev) => ({ ...prev, [taskId]: '' }));
    await loadTasks(selectedProject.id);
    await logAudit({
      event_type: 'task.subtask_created',
      entity_type: 'task',
      entity_id: taskId,
      action: 'create',
      details: title,
    });
  };

  type PickRow = { id: string; name?: string; title?: string };

  const linkPickOptions = (): PickRow[] => {
    switch (linkPickType) {
      case 'customer':
        return pickCustomers;
      case 'budget_proposal':
        return pickBudgets;
      case 'wiki_page':
        return pickWiki;
      case 'repo_link':
        return pickRepos;
      case 'financial_record':
        return pickFinance;
      default:
        return [];
    }
  };

  const handleCreateProject = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    await supabase.from('projects').insert({ ...form, created_by: profile?.id });
    await loadProjects();
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm());
  };

  const handleStatusUpdate = async (id: string, status: Project['status']) => {
    await supabase.from('projects').update({ status }).eq('id', id);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (selectedProject?.id === id) setSelectedProject(prev => prev ? { ...prev, status } : null);
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <TopBar title="Projects" subtitle={`${projects.length} projects total`} />
      <div className="p-6 space-y-5">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary w-52"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              {['planning','active','on_hold','completed','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace('_',' ')}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white hover:bg-muted'} transition-colors`}>
                <Kanban size={15} />
              </button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white hover:bg-muted'} transition-colors`}>
                <List size={15} />
              </button>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-5 gap-3">
          {['planning','active','on_hold','completed','cancelled'].map(s => {
            const count = projects.filter(p => p.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s === filterStatus ? 'all' : s)}
                className={`bg-white rounded-xl border p-3 text-center transition-all ${filterStatus === s ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}
              >
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.replace('_',' ')}</p>
              </button>
            );
          })}
        </div>

        {/* Project Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Kanban size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No projects found</p>
            {canManage && (
              <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-primary hover:underline">
                Create your first project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedProject(project); loadTasks(project.id); }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{project.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.description || 'No description'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${statusColors[project.status]}`}>
                    {project.status.replace('_',' ')}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-foreground">{project.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div
                      className="h-1.5 bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign size={11} />
                    <span>Budget: ${(project.budget / 1000).toFixed(0)}K</span>
                  </div>
                  {project.end_date && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar size={11} />
                      <span>{new Date(project.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className={`text-xs font-medium ${priorityColors[project.priority]}`}>
                    {project.priority} priority
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {filtered.map(project => (
              <div
                key={project.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 cursor-pointer"
                onClick={() => { setSelectedProject(project); loadTasks(project.id); }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.description || 'No description'}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColors[project.status]}`}>
                  {project.status.replace('_',' ')}
                </span>
                <div className="text-right text-xs text-muted-foreground hidden md:block w-24">
                  <p>{project.progress}% done</p>
                  <div className="w-full h-1 bg-muted rounded-full mt-1">
                    <div className="h-1 bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
                <span className={`text-xs font-medium hidden lg:block ${priorityColors[project.priority]}`}>{project.priority}</span>
                <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Create New Project</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Project Name *</label>
                <input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Portal v2"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status || 'planning'} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                  <select value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value as Project['priority'] })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                    {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Budget ($)</label>
                  <input type="number" value={form.budget || 0} onChange={e => setForm({ ...form, budget: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Progress (%)</label>
                  <input type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                  <input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                  <input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreateProject} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedProject(null)} />
          <div className="relative bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-foreground">{selectedProject.name}</h2>
              <button onClick={() => setSelectedProject(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground">{selectedProject.description || 'No description'}</p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Status', value: selectedProject.status.replace('_',' '), extra: statusColors[selectedProject.status] },
                  { label: 'Priority', value: selectedProject.priority },
                  { label: 'Budget', value: `$${selectedProject.budget.toLocaleString()}` },
                  { label: 'Spent', value: `$${selectedProject.spent.toLocaleString()}` },
                  { label: 'Start', value: selectedProject.start_date ? new Date(selectedProject.start_date).toLocaleDateString() : '—' },
                  { label: 'End', value: selectedProject.end_date ? new Date(selectedProject.end_date).toLocaleDateString() : '—' },
                ].map(({ label, value, extra }) => (
                  <div key={label} className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    {extra ? (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${extra}`}>{value}</span>
                    ) : (
                      <p className="text-sm font-semibold text-foreground capitalize">{value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-foreground">Progress</span>
                  <span className="text-muted-foreground">{selectedProject.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full">
                  <div className="h-2 bg-primary rounded-full" style={{ width: `${selectedProject.progress}%` }} />
                </div>
              </div>

              {timelineRange() && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Timeline</p>
                  <p className="text-xs text-muted-foreground mb-3">Gantt-style bars from task start → due date.</p>
                  <div className="space-y-3">
                    {tasks
                      .filter((t: any) => t.created_at)
                      .map((task: any) => {
                        const r = timelineRange()!;
                        const startMs = parseISO(task.created_at).getTime();
                        const endMs = task.due_date ? parseISO(task.due_date).getTime() : startMs + 86400000;
                        const left = ((startMs - r.tMin) / r.span) * 100;
                        const width = Math.max(((endMs - startMs) / r.span) * 100, 1.5);
                        return (
                          <div key={task.id}>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 gap-2">
                              <span className="truncate flex-1">{task.title}</span>
                              <span className="flex-shrink-0">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</span>
                            </div>
                            <div className="relative h-5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="absolute top-1 bottom-1 bg-primary/90 rounded-full min-w-[6px]"
                                style={{ left: `${Math.min(Math.max(left, 0), 98)}%`, width: `${Math.min(width, 100 - left)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={14} className="text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Linked records</p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap gap-2 mb-3 items-center">
                    <select
                      value={linkPickType}
                      onChange={(e) => {
                        setLinkPickType(e.target.value as ProjectFeatureLinkType);
                        setLinkPickId('');
                      }}
                      className="text-xs border border-input rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="customer">Customer</option>
                      <option value="financial_record">Finance record</option>
                      <option value="budget_proposal">Budget proposal</option>
                      <option value="wiki_page">Wiki page</option>
                      <option value="repo_link">Repo link</option>
                    </select>
                    <select
                      value={linkPickId}
                      onChange={(e) => setLinkPickId(e.target.value)}
                      className="flex-1 min-w-[140px] text-xs border border-input rounded-lg px-2 py-1.5 bg-white"
                    >
                      <option value="">Select…</option>
                      {linkPickOptions().map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name ?? opt.title ?? opt.id}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void addFeatureLink()}
                      disabled={!linkPickId}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      Link
                    </button>
                  </div>
                )}
                {featureLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-2">No cross-links yet.</p>
                ) : (
                  <ul className="space-y-1.5 mb-2">
                    {featureLinks.map((l) => (
                      <li key={l.id} className="text-xs text-foreground flex justify-between gap-2">
                        <span className="uppercase text-muted-foreground whitespace-nowrap">{l.feature_type.replace('_', ' ')}</span>
                        <span className="truncate text-right">{linkLabels[`${l.feature_type}:${l.feature_id}`] ?? l.feature_id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-primary">Platform connection</p>
                    <p className="text-sm font-semibold text-foreground">External data sources</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={integrations.length > 0}
                        onChange={() => {
                          // This checkbox is informational: integrations are configured via the “Add integration” form below.
                          // If integrations.length === 0 it effectively means “not linked yet”.
                        }}
                      />
                      Link external data sources
                    </label>
                    <button
                      type="button"
                      onClick={() => void (selectedProject?.id ? loadLiveIntegrationData(selectedProject.id) : undefined)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Refresh live data
                    </button>
                  </div>
                </div>

                {integrations.length === 0 ? (
                  <p className="text-xs text-muted-foreground mb-3">No external platform connections configured yet. Add an integration to enable live pull and pushed data preview.</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="rounded-2xl border border-border bg-white p-3 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-foreground">{integration.platform}</p>
                            <p className="text-muted-foreground truncate">{integration.endpoint}</p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {integration.auth_type}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Last push: {integration.last_pushed_at ? new Date(integration.last_pushed_at).toLocaleString() : 'never'}
                        </div>
                        {integration.last_pushed_payload && (
                          <div className="mt-2">
                            <p className="text-[10px] font-semibold text-foreground mb-1">Latest pushed payload</p>
                            <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words text-[10px] bg-muted/30 rounded p-2">{JSON.stringify(integration.last_pushed_payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      value={integrationForm.platform}
                      onChange={(e) => setIntegrationForm((prev) => ({ ...prev, platform: e.target.value }))}
                      placeholder="Platform name"
                      className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                    />
                    <input
                      value={integrationForm.endpoint}
                      onChange={(e) => setIntegrationForm((prev) => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="Data endpoint URL"
                      className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select
                      value={integrationForm.auth_type}
                      onChange={(e) => setIntegrationForm((prev) => ({ ...prev, auth_type: e.target.value as ProjectIntegrationAuthType }))}
                      className="text-xs border border-input rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="none">No auth</option>
                      <option value="apikey">API key</option>
                      <option value="bearer">Bearer token</option>
                      <option value="basic">Basic auth</option>
                    </select>
                    <input
                      value={integrationForm.apiKey}
                      onChange={(e) => setIntegrationForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="API key"
                      className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                    />
                    <input
                      value={integrationForm.bearerToken}
                      onChange={(e) => setIntegrationForm((prev) => ({ ...prev, bearerToken: e.target.value }))}
                      placeholder="Bearer token"
                      className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                    />
                  </div>
                  {integrationForm.auth_type === 'basic' && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        value={integrationForm.username}
                        onChange={(e) => setIntegrationForm((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="Username"
                        className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                      />
                      <input
                        type="password"
                        value={integrationForm.password}
                        onChange={(e) => setIntegrationForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full text-xs px-3 py-2 border border-input rounded-lg bg-white"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void addIntegration()}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground"
                  >
                    Add integration
                  </button>
                </div>

                {integrationLoading && (
                  <p className="mt-3 text-xs text-muted-foreground">Fetching live integration data…</p>
                )}
                {liveIntegrationData && (
                  <div className="mt-3 rounded-2xl border border-border bg-white p-3 text-xs text-foreground">
                    <p className="font-semibold text-sm mb-2">Live integration preview</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px]">{JSON.stringify(liveIntegrationData, null, 2)}</pre>
                  </div>
                )}
              </div>

              {canManage && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(['planning','active','on_hold','completed','cancelled'] as Project['status'][]).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusUpdate(selectedProject.id, s)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-all ${selectedProject.status === s ? statusColors[s] : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                      >
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Tasks</p>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                        <div className="flex items-center gap-3 py-2 px-3 bg-muted/30">
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              task.status === 'done'
                                ? 'bg-emerald-500'
                                : task.status === 'blocked' || task.status === 'cancelled'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                            }`}
                          />
                          <span className="text-sm text-foreground flex-1 truncate">{task.title}</span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              task.status === 'done'
                                ? 'bg-emerald-100 text-emerald-700'
                                : task.status === 'blocked' || task.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        {(subtasksByTaskId[task.id]?.length ?? 0) > 0 && (
                          <ul className="px-3 pb-2 pt-1 space-y-1 border-t border-border/60 bg-white/50">
                            {(subtasksByTaskId[task.id] ?? []).map((st) => (
                              <li key={st.id} className="text-[11px] text-muted-foreground flex justify-between gap-2">
                                <span className="truncate">{st.title}</span>
                                <span className="flex-shrink-0 uppercase">{st.status.replace('_', ' ')}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {canManage && (
                          <div className="px-3 py-2 flex gap-2 border-t border-border/60 bg-white/80">
                            <input
                              value={subtaskDraft[task.id] ?? ''}
                              onChange={(e) =>
                                setSubtaskDraft((prev) => ({ ...prev, [task.id]: e.target.value }))
                              }
                              placeholder="New subtask…"
                              className="flex-1 text-xs px-2 py-1 rounded border border-input bg-white"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void addSubtaskForTask(task.id);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void addSubtaskForTask(task.id)}
                              className="text-xs font-semibold px-2 py-1 rounded bg-primary text-primary-foreground"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
