'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import {
  Plus, Search, LayoutGrid, List, Calendar, DollarSign,
  Users, TrendingUp, Building2, Tag, Briefcase, Filter,
  ChevronRight, Loader as Loader2, AlertCircle,
} from 'lucide-react';

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  project_code: string | null;
  project_type: string | null;
  department: string | null;
  category: string | null;
  tags: string[] | null;
  expected_revenue: number | null;
  customer_price: number | null;
  customer_name?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  planning:    'bg-blue-100 text-blue-700',
  active:      'bg-emerald-100 text-emerald-700',
  on_hold:     'bg-amber-100 text-amber-700',
  completed:   'bg-slate-100 text-slate-600',
  cancelled:   'bg-red-100 text-red-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:      'bg-slate-100 text-slate-500',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS = ['all', 'planning', 'active', 'on_hold', 'completed', 'cancelled'];

export default function ProjectsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchProjects = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select(`
          id, name, description, status, priority, progress,
          budget, spent, start_date, end_date, created_at,
          project_code, project_type, department, category,
          tags, expected_revenue, customer_price,
          customers (name)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const rows: ProjectRow[] = (data || []).map((p: any) => ({
        ...p,
        customer_name: p.customers?.name ?? null,
      }));
      setProjects(rows);
    } catch (e: any) {
      setError(e.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filtered = projects.filter(p => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.project_code || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.department || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    totalBudget: projects.reduce((s, p) => s + (p.budget || 0), 0),
    totalRevenue: projects.reduce((s, p) => s + (p.expected_revenue || p.customer_price || 0), 0),
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Projects" subtitle={`${stats.total} projects`} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <Briefcase size={16} className="text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-400">Total Projects</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <TrendingUp size={16} className="text-emerald-500 mb-2" />
            <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <DollarSign size={16} className="text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-slate-800">${(stats.totalBudget / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-400">Total Budget</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <TrendingUp size={16} className="text-primary mb-2" />
            <p className="text-2xl font-bold text-slate-800">${(stats.totalRevenue / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-400">Expected Revenue</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
            >
              <List size={15} />
            </button>
          </div>

          <button
            onClick={() => router.push('/projects/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} /> New Project
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Briefcase size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500 mb-1">No projects found</p>
            <p className="text-xs text-slate-400 mb-4">Try adjusting your search or filters, or create a new project.</p>
            <button
              onClick={() => router.push('/projects/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Create Project
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {filtered.map(p => (
              <ProjectListRow key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project: p, onClick }: { project: ProjectRow; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-500'}`}>
              {p.status.replace('_', ' ')}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[p.priority] || 'bg-slate-100 text-slate-500'}`}>
              {p.priority}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-primary transition-colors">{p.name}</h3>
          {p.project_code && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.project_code}</p>}
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-primary flex-shrink-0 mt-1 transition-colors" />
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {p.project_type && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">{p.project_type.replace(/_/g, ' ')}</span>
        )}
        {p.department && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">{p.department}</span>
        )}
        {p.customer_name && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 flex items-center gap-0.5">
            <Building2 size={8} />{p.customer_name}
          </span>
        )}
      </div>

      {/* Tags */}
      {p.tags && p.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {p.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{t}</span>
          ))}
          {p.tags.length > 3 && <span className="text-[9px] text-slate-400">+{p.tags.length - 3} more</span>}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-slate-400">Progress</span>
          <span className="font-semibold text-slate-600">{p.progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full">
          <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${p.progress}%` }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-1">
        <div className="flex items-center gap-1"><DollarSign size={9} />Budget: ${Number(p.budget || 0).toLocaleString()}</div>
        {(p.expected_revenue || p.customer_price) ? (
          <div className="flex items-center gap-1 text-emerald-600 font-medium">
            <TrendingUp size={9} />${Number(p.expected_revenue || p.customer_price || 0).toLocaleString()}
          </div>
        ) : null}
        {p.end_date && (
          <div className="flex items-center gap-1"><Calendar size={9} />{new Date(p.end_date).toLocaleDateString()}</div>
        )}
      </div>
    </div>
  );
}

function ProjectListRow({ project: p, onClick }: { project: ProjectRow; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors truncate">{p.name}</span>
          {p.project_code && <span className="text-[10px] font-mono text-slate-400">{p.project_code}</span>}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-500'}`}>
            {p.status.replace('_', ' ')}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[p.priority] || 'bg-slate-100 text-slate-500'}`}>
            {p.priority}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
          {p.project_type && <span className="capitalize">{p.project_type.replace(/_/g, ' ')}</span>}
          {p.department && <span>{p.department}</span>}
          {p.customer_name && <span className="text-emerald-600 flex items-center gap-0.5"><Building2 size={8} />{p.customer_name}</span>}
          {p.tags && p.tags.length > 0 && (
            <span className="flex items-center gap-0.5 text-primary"><Tag size={8} />{p.tags.slice(0, 2).join(', ')}{p.tags.length > 2 ? ` +${p.tags.length - 2}` : ''}</span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1 w-24 shrink-0">
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-slate-500 w-7 text-right">{p.progress}%</span>
      </div>

      <div className="hidden md:block text-[11px] text-slate-500 shrink-0">
        ${Number(p.budget || 0).toLocaleString()}
      </div>
      {(p.expected_revenue || p.customer_price) ? (
        <div className="hidden lg:block text-[11px] font-semibold text-emerald-600 shrink-0">
          +${Number(p.expected_revenue || p.customer_price || 0).toLocaleString()}
        </div>
      ) : null}
      {p.end_date && (
        <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
          <Calendar size={10} />{new Date(p.end_date).toLocaleDateString()}
        </div>
      )}
      <ChevronRight size={14} className="text-slate-300 group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}
