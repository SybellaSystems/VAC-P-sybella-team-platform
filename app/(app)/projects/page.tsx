'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project } from '@/lib/database.types';
import { Plus, Search, Calendar, DollarSign, ChevronRight, Kanban, List, X, Sparkles, Archive } from 'lucide-react';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700', completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600',
};
const priorityColors: Record<string, string> = { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' };
const emptyForm = (): Partial<Project> => ({ name: '', description: '', status: 'planning', priority: 'medium', budget: 0, spent: 0, progress: 0 });

export default function ProjectsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const canManage = ['admin', 'director', 'manager'].includes(profile?.role || '');

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    setProjects((data as Project[]) || []);
    setLoading(false);
  };

  const handleCreateProject = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    await supabase.from('projects').insert({ ...form, created_by: profile?.id });
    await loadProjects();
    setSaving(false); setShowModal(false); setForm(emptyForm());
  };

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const archivedProjects = projects.filter(p => p.status === 'completed' || p.status === 'cancelled');
  const displayProjects = showArchived ? archivedProjects : activeProjects;

  const filtered = displayProjects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <TopBar title="Projects" subtitle={`${activeProjects.length} active · ${archivedProjects.length} archived`} />
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary w-52" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
            <div className="flex rounded-lg border border-input overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white hover:bg-muted'} transition-colors`}><Kanban size={15} /></button>
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white hover:bg-muted'} transition-colors`}><List size={15} /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowArchived(!showArchived)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${showArchived ? 'bg-slate-700 text-white' : 'border border-input bg-white text-foreground hover:bg-muted'}`}>
              <Archive size={16} /> {showArchived ? 'Show Active' : 'Archived'}
            </button>
            {canManage && !showArchived && (
              <>
                <button onClick={() => router.push('/projects/new')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                  <Sparkles size={16} /> Creation Wizard
                </button>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 border border-input bg-white text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition-colors">
                  <Plus size={16} /> Quick Create
                </button>
              </>)}
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {['planning','active','on_hold','completed','cancelled'].map(s => {
            const count = projects.filter(p => p.status === s).length;
            return (
              <button key={s} onClick={() => { setFilterStatus(s === filterStatus ? 'all' : s); if (s === 'completed' || s === 'cancelled') setShowArchived(true); else setShowArchived(false); }}
                className={`bg-white rounded-xl border p-3 text-center transition-all ${filterStatus === s ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'}`}>
                <p className="text-lg font-bold text-foreground">{count}</p><p className="text-[10px] text-muted-foreground capitalize mt-0.5">{s.replace('_',' ')}</p>
              </button>);})}
        </div>

        {/* Section header */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700">{showArchived ? 'Archived Projects' : 'Active Projects'}</h2>
          <span className="text-xs text-slate-400">({filtered.length})</span>
        </div>

        {/* Project Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (<div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse"><div className="h-4 bg-muted rounded w-3/4 mb-3" /><div className="h-3 bg-muted rounded w-full mb-2" /><div className="h-3 bg-muted rounded w-2/3" /></div>))}
          </div>) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <Kanban size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">{showArchived ? 'No archived projects' : 'No active projects found'}</p>
            {canManage && !showArchived && (<button onClick={() => router.push('/projects/new')} className="mt-3 text-sm text-primary hover:underline">Start the creation wizard</button>)}
          </div>) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(project => (
              <div key={project.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0"><h3 className="font-semibold text-foreground text-sm truncate">{project.name}</h3><p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{project.description || 'No description'}</p></div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${statusColors[project.status]}`}>{project.status.replace('_',' ')}</span>
                </div>
                <div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span className="font-semibold text-foreground">{project.progress}%</span></div>
                  <div className="w-full h-1.5 bg-muted rounded-full"><div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} /></div></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign size={11} /><span>Budget: ${(project.budget / 1000).toFixed(0)}K</span></div>
                  {project.end_date && <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar size={11} /><span>{new Date(project.end_date).toLocaleDateString()}</span></div>}
                  <div className={`text-xs font-medium ${priorityColors[project.priority]}`}>{project.priority} priority</div>
                </div>
              </div>))}
          </div>) : (
          <div className="bg-white rounded-xl border border-border divide-y divide-border">
            {filtered.map(project => (
              <div key={project.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/projects/${project.id}`)}>
                <div className="flex-1 min-w-0"><p className="font-semibold text-foreground text-sm">{project.name}</p><p className="text-xs text-muted-foreground truncate">{project.description || 'No description'}</p></div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColors[project.status]}`}>{project.status.replace('_',' ')}</span>
                <div className="text-right text-xs text-muted-foreground hidden md:block w-24"><p>{project.progress}% done</p><div className="w-full h-1 bg-muted rounded-full mt-1"><div className="h-1 bg-primary rounded-full" style={{ width: `${project.progress}%` }} /></div></div>
                <span className={`text-xs font-medium hidden lg:block ${priorityColors[project.priority]}`}>{project.priority}</span>
                <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />
              </div>))}
          </div>)}

        {/* Archived banner */}
        {showArchived && archivedProjects.length > 0 && (
          <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-2">
            <Archive size={16} className="text-slate-500" />
            <p className="text-sm text-slate-600">These projects are archived. They are no longer in the active list and can only be viewed or reopened from their detail page.</p>
          </div>)}
      </div>

      {/* Quick Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-foreground">Quick Create Project</h2><button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Project Name *</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Customer Portal v2" className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
              <div><label className="block text-xs font-medium text-muted-foreground mb-1">Description</label><textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Status</label><select value={form.status || 'planning'} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">{['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label><select value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value as Project['priority'] })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">{['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Budget ($)</label><input type="number" value={form.budget || 0} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Progress (%)</label><input type="number" min="0" max="100" value={form.progress || 0} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label><input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
                <div><label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label><input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleCreateProject} disabled={saving} className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">{saving ? 'Creating...' : 'Create Project'}</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
