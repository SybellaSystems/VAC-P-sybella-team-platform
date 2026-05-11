'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project, Profile } from '@/lib/database.types';
import { Plus, Search, Filter, Calendar, DollarSign, Users, ChevronRight, Kanban, List, MoveHorizontal as MoreHorizontal, X } from 'lucide-react';

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
    setTasks(data || []);
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
                  <div className="space-y-2">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="text-sm text-foreground flex-1 truncate">{task.title}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700' : task.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {task.status.replace('_',' ')}
                        </span>
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
