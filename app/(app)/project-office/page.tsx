'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { FolderKanban, Activity, HeartPulse, TriangleAlert as AlertTriangle, Plus, Pencil, Trash2, Loader as Loader2, CircleAlert as AlertCircle, RefreshCw, Users, Target, Flag, ShieldAlert, Calendar, DollarSign, TrendingUp, ArrowUpDown, X } from 'lucide-react';
import { toast } from 'sonner';

type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
type SortKey = 'health_score' | 'progress' | 'start_date';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: string;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  health_score: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  project_code?: string | null;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
}

interface Phase {
  id: string;
  project_id: string;
  name: string;
  status: string;
  progress: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Risk {
  id: string;
  project_id: string;
  title: string;
  severity: string;
  status: string;
  description: string | null;
  created_at: string;
}

interface Assignment {
  id: string;
  project_id: string;
  member_id: string;
  role_in_project: string;
  profile?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; badge: string; dot: string }> = {
  planning: { label: 'Planning', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  active: { label: 'Active', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  on_hold: { label: 'On Hold', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Completed', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

function getHealthColor(score: number | null): string {
  if (score == null) return 'bg-slate-300';
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getHealthLabel(score: number | null): string {
  if (score == null) return 'N/A';
  if (score >= 75) return 'Healthy';
  if (score >= 50) return 'At Risk';
  return 'Critical';
}

function getBudgetStatus(budget: number, spent: number): { label: string; color: string } {
  if (budget <= 0) return { label: 'No budget', color: 'text-slate-400' };
  const pct = (spent / budget) * 100;
  if (pct > 100) return { label: 'Over budget', color: 'text-red-600' };
  if (pct > 85) return { label: 'Near limit', color: 'text-amber-600' };
  return { label: `${Math.round(pct)}% used`, color: 'text-emerald-600' };
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

const emptyForm = {
  name: '',
  description: '',
  status: 'planning' as ProjectStatus,
  priority: 'medium',
  budget: '',
  start_date: '',
  end_date: '',
  health_score: '75',
};

export default function ProjectOfficePage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('health_score');

  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: projErr } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (projErr) throw projErr;
      setProjects((data as Project[]) || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err?.message || 'Failed to load projects');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadDetail = useCallback(async (projectId: string) => {
    setDetailLoading(true);
    try {
      const [msRes, phRes, rkRes, asRes] = await Promise.all([
        supabase.from('project_milestones').select('*').eq('project_id', projectId).order('due_date', { ascending: true, nullsFirst: false }),
        supabase.from('project_phases').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
        supabase.from('project_risks').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        supabase
          .from('project_assignments')
          .select('*, profile:profiles!project_assignments_member_id_fkey(full_name)')
          .eq('project_id', projectId),
      ]);

      if (msRes.error) throw msRes.error;
      if (phRes.error) throw phRes.error;
      if (rkRes.error) throw rkRes.error;
      if (asRes.error) throw asRes.error;

      setMilestones((msRes.data as Milestone[]) || []);
      setPhases((phRes.data as Phase[]) || []);
      setRisks((rkRes.data as Risk[]) || []);
      setAssignments((asRes.data as Assignment[]) || []);
    } catch (err: any) {
      console.error('Error fetching project detail:', err);
      toast.error('Failed to load project details');
      setMilestones([]);
      setPhases([]);
      setRisks([]);
      setAssignments([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function openCreate() {
    setEditingProject(null);
    setForm({ ...emptyForm });
    setShowProjectDialog(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setForm({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'planning',
      priority: project.priority || 'medium',
      budget: project.budget != null ? String(project.budget) : '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      health_score: project.health_score != null ? String(project.health_score) : '75',
    });
    setShowProjectDialog(true);
  }

  async function handleSaveProject() {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    const budgetNum = form.budget ? parseFloat(form.budget) : 0;
    if (isNaN(budgetNum) || budgetNum < 0) {
      toast.error('Please enter a valid budget');
      return;
    }
    const healthNum = parseInt(form.health_score, 10);
    if (isNaN(healthNum) || healthNum < 0 || healthNum > 100) {
      toast.error('Health score must be between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        budget: budgetNum,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        health_score: healthNum,
      };

      if (editingProject) {
        const { error: upErr } = await supabase
          .from('projects')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingProject.id);
        if (upErr) throw upErr;
        toast.success('Project updated');
      } else {
        const { error: inErr } = await supabase
          .from('projects')
          .insert({ ...payload, created_by: profile?.id || null, progress: 0, spent: 0 });
        if (inErr) throw inErr;
        toast.success('Project created');
      }
      setShowProjectDialog(false);
      setEditingProject(null);
      setForm({ ...emptyForm });
      await loadProjects();
    } catch (err: any) {
      console.error('Error saving project:', err);
      toast.error(err?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!confirm(`Delete project "${project.name}"? This will remove it permanently.`)) return;
    try {
      const { error: delErr } = await supabase.from('projects').delete().eq('id', project.id);
      if (delErr) throw delErr;
      toast.success('Project deleted');
      if (detailProject?.id === project.id) {
        setShowDetailDialog(false);
        setDetailProject(null);
      }
      await loadProjects();
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast.error(err?.message || 'Failed to delete project');
    }
  }

  async function openDetail(project: Project) {
    setDetailProject(project);
    setShowDetailDialog(true);
    await loadDetail(project.id);
  }

  const filteredAndSorted = useMemo(() => {
    let list = projects;
    if (filterStatus !== 'all') {
      list = list.filter((p) => p.status === filterStatus);
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === 'health_score') {
        return (b.health_score ?? 0) - (a.health_score ?? 0);
      }
      if (sortKey === 'progress') {
        return (b.progress ?? 0) - (a.progress ?? 0);
      }
      // start_date — earliest first
      const aDate = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return aDate - bDate;
    });
    return sorted;
  }, [projects, filterStatus, sortKey]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'active').length;
    const withHealth = projects.filter((p) => p.health_score != null);
    const avgHealth =
      withHealth.length > 0
        ? Math.round(withHealth.reduce((sum, p) => sum + (p.health_score || 0), 0) / withHealth.length)
        : 0;
    const atRisk = projects.filter((p) => (p.health_score ?? 100) < 50).length;
    return { total, active, avgHealth, atRisk };
  }, [projects]);

  if (loading) {
    return (
      <div>
        <TopBar title="Project Office" subtitle="Manage all projects and their health" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Project Office" subtitle="Manage all projects and their health" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Projects</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <FolderKanban className="h-4 w-4 mr-1 text-blue-600" /> All projects
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Projects</CardDescription>
              <CardTitle className="text-2xl">{stats.active}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <Activity className="h-4 w-4 mr-1 text-emerald-600" /> In progress
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Health Score</CardDescription>
              <CardTitle className="text-2xl">{stats.avgHealth}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <HeartPulse className="h-4 w-4 mr-1 text-purple-600" /> Across portfolio
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>At-Risk Projects</CardDescription>
              <CardTitle className="text-2xl">{stats.atRisk}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <AlertTriangle className="h-4 w-4 mr-1 text-red-600" /> Health &lt; 50
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
              <Button variant="outline" size="sm" onClick={loadProjects}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header + filters */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Project Portfolio</h2>
            <p className="text-sm text-slate-500">{filteredAndSorted.length} of {projects.length} projects</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">Status:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">
              <ArrowUpDown className="h-3.5 w-3.5 inline mr-1" />
              Sort by:
            </Label>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="health_score">Health Score</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
                <SelectItem value="start_date">Start Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project grid */}
        {filteredAndSorted.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-1">No projects found</p>
              <p className="text-sm text-slate-400 mb-4">
                {projects.length === 0 ? 'Create your first project to get started' : 'Try changing the filter'}
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSorted.map((project) => {
              const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
              const budget = getBudgetStatus(project.budget, project.spent);
              return (
                <Card
                  key={project.id}
                  className="hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                  onClick={() => openDetail(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          {project.project_code || project.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(project);
                          }}
                          className="p-1 rounded hover:bg-slate-100 text-slate-500"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project);
                          }}
                          className="p-1 rounded hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`${statusCfg.badge} border-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} mr-1`} />
                        {statusCfg.label}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getHealthColor(project.health_score)}`} />
                        <span className="text-xs font-medium text-slate-600">
                          {getHealthLabel(project.health_score)} · {project.health_score ?? '—'}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress || 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (project.progress || 0) >= 75 ? 'bg-emerald-500' : (project.progress || 0) >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, project.progress || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                        <span className={budget.color}>{budget.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{formatDate(project.start_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'New Project'}</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update the details of this project' : 'Create a new project for the portfolio'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="proj-name">Project Name</Label>
                <Input
                  id="proj-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Customer Portal Redesign"
                />
              </div>
              <div>
                <Label htmlFor="proj-desc">Description</Label>
                <Input
                  id="proj-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="proj-budget">Budget ($)</Label>
                <Input
                  id="proj-budget"
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="proj-health">Health Score (%)</Label>
                <Input
                  id="proj-health"
                  type="number"
                  min="0"
                  max="100"
                  value={form.health_score}
                  onChange={(e) => setForm({ ...form, health_score: e.target.value })}
                  placeholder="75"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proj-start">Start Date</Label>
                  <Input
                    id="proj-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="proj-end">End Date</Label>
                  <Input
                    id="proj-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProjectDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveProject} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProject ? 'Save Changes' : 'Create Project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{detailProject?.name}</DialogTitle>
              <DialogDescription>
                {detailProject?.project_code || detailProject?.description || 'Project details'}
              </DialogDescription>
            </DialogHeader>

            {detailProject && (
              <div className="space-y-5">
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {/* Top metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <HeartPulse className="h-3 w-3" /> Health
                        </p>
                        <p className="font-bold text-slate-900">
                          {detailProject.health_score ?? '—'}%
                        </p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getHealthColor(detailProject.health_score)}`}
                            style={{ width: `${detailProject.health_score ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Progress
                        </p>
                        <p className="font-bold text-slate-900">{detailProject.progress || 0}%</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${detailProject.progress || 0}%` }} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Budget
                        </p>
                        <p className="font-bold text-slate-900 text-sm">{formatCurrency(detailProject.budget)}</p>
                        <p className={`text-xs ${getBudgetStatus(detailProject.budget, detailProject.spent).color}`}>
                          {formatCurrency(detailProject.spent)} spent
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Team
                        </p>
                        <p className="font-bold text-slate-900">{assignments.length}</p>
                        <p className="text-xs text-slate-400">members</p>
                      </div>
                    </div>

                    {/* Counts row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                        <Target className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-bold text-slate-900">{milestones.length}</p>
                          <p className="text-xs text-slate-500">Milestones</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                        <Flag className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-bold text-slate-900">{phases.length}</p>
                          <p className="text-xs text-slate-500">Phases</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-bold text-slate-900">{risks.length}</p>
                          <p className="text-xs text-slate-500">Risks</p>
                        </div>
                      </div>
                    </div>

                    {/* Team */}
                    <div className="border-t border-slate-200 pt-4">
                      <Label className="mb-2 block">Team Members</Label>
                      {assignments.length === 0 ? (
                        <p className="text-sm text-slate-400">No team members assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {assignments.map((a) => (
                            <Badge key={a.id} variant="secondary" className="flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              {a.profile?.full_name || 'Unknown'}
                              <span className="text-xs text-slate-400 ml-1">· {a.role_in_project}</span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phases */}
                    <div className="border-t border-slate-200 pt-4">
                      <Label className="mb-2 block flex items-center gap-1.5">
                        <Flag className="h-4 w-4" /> Phases
                      </Label>
                      {phases.length === 0 ? (
                        <p className="text-sm text-slate-400">No phases defined</p>
                      ) : (
                        <div className="space-y-2">
                          {phases.map((ph) => (
                            <div key={ph.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-slate-800">{ph.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {ph.status || 'pending'}
                                </Badge>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, ph.progress || 0)}%` }} />
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatDate(ph.start_date)} → {formatDate(ph.end_date)} · {ph.progress || 0}%
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Milestones */}
                    <div className="border-t border-slate-200 pt-4">
                      <Label className="mb-2 block flex items-center gap-1.5">
                        <Target className="h-4 w-4" /> Milestones
                      </Label>
                      {milestones.length === 0 ? (
                        <p className="text-sm text-slate-400">No milestones defined</p>
                      ) : (
                        <div className="space-y-1.5">
                          {milestones.map((ms) => (
                            <div key={ms.id} className="flex items-center gap-2 text-sm">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${ms.is_completed ? 'bg-emerald-500' : 'bg-slate-300'}`}
                              />
                              <span className={ms.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}>
                                {ms.title}
                              </span>
                              <span className="text-xs text-slate-400 ml-auto">{formatDate(ms.due_date)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Risks */}
                    <div className="border-t border-slate-200 pt-4">
                      <Label className="mb-2 block flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4" /> Risks
                      </Label>
                      {risks.length === 0 ? (
                        <p className="text-sm text-slate-400">No risks identified</p>
                      ) : (
                        <div className="space-y-2">
                          {risks.map((rk) => (
                            <div key={rk.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-medium text-slate-800">{rk.title}</p>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border-0 ${
                                      rk.severity === 'high' || rk.severity === 'critical'
                                        ? 'bg-red-100 text-red-700'
                                        : rk.severity === 'medium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {rk.severity || 'low'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {rk.status || 'open'}
                                  </Badge>
                                </div>
                              </div>
                              {rk.description && <p className="text-xs text-slate-500">{rk.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (detailProject) openEdit(detailProject);
                  setShowDetailDialog(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                <X className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
