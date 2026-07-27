'use client';

import { useState, useEffect, useMemo } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShieldAlert, Plus, Filter, TrendingUp, TrendingDown, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Clock, Trash2, Pencil, CircleAlert as AlertCircle, Grid3x3, List } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Probability = 'low' | 'medium' | 'high';
type Impact = 'low' | 'medium' | 'high';
type RiskStatus = 'open' | 'mitigating' | 'closed' | 'accepted';

interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  probability: Probability;
  impact: Impact;
  status: RiskStatus;
  mitigation_plan: string | null;
  owner_id: string | null;
  identified_date: string | null;
  created_at: string;
  project?: { id: string; name: string } | null;
  owner?: { full_name: string } | null;
}

const probabilityConfig: Record<Probability, { label: string; badge: string; score: number }> = {
  low: { label: 'Low', badge: 'bg-emerald-100 text-emerald-700', score: 1 },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-700', score: 2 },
  high: { label: 'High', badge: 'bg-red-100 text-red-700', score: 3 },
};

const impactConfig: Record<Impact, { label: string; badge: string; score: number }> = {
  low: { label: 'Low', badge: 'bg-emerald-100 text-emerald-700', score: 1 },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-700', score: 2 },
  high: { label: 'High', badge: 'bg-red-100 text-red-700', score: 3 },
};

const statusConfig: Record<RiskStatus, { label: string; badge: string; icon: typeof Clock }> = {
  open: { label: 'Open', badge: 'bg-red-100 text-red-700', icon: AlertTriangle },
  mitigating: { label: 'Mitigating', badge: 'bg-amber-100 text-amber-700', icon: Clock },
  closed: { label: 'Closed', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  accepted: { label: 'Accepted', badge: 'bg-slate-100 text-slate-700', icon: CheckCircle2 },
};

function getRiskScore(prob: Probability, impact: Impact): number {
  return probabilityConfig[prob].score * impactConfig[impact].score;
}

function getRiskLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 6) return { label: 'Critical', color: 'text-red-700', bg: 'bg-red-500' };
  if (score >= 4) return { label: 'High', color: 'text-amber-700', bg: 'bg-amber-500' };
  if (score >= 2) return { label: 'Medium', color: 'text-blue-700', bg: 'bg-blue-500' };
  return { label: 'Low', color: 'text-emerald-700', bg: 'bg-emerald-500' };
}

export default function RisksPage() {
  const { profile } = useAuth();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

  const [filters, setFilters] = useState({
    project: 'all',
    probability: 'all',
    impact: 'all',
    status: 'all',
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ProjectRisk | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [riskForm, setRiskForm] = useState({
    project_id: '',
    title: '',
    description: '',
    probability: 'medium' as Probability,
    impact: 'medium' as Impact,
    status: 'open' as RiskStatus,
    mitigation_plan: '',
    owner_id: '',
  });

  useEffect(() => {
    if (profile) {
      fetchRisks();
      fetchProjects();
      fetchProfiles();
    }
  }, [profile]);

  async function fetchRisks() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*, project:projects!project_risks_project_id_fkey(id,name), owner:profiles!project_risks_owner_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRisks((data as ProjectRisk[]) || []);
    } catch (err: any) {
      console.error('Error fetching risks:', err);
      setError(err?.message || 'Failed to load risks');
      toast.error('Failed to load risks');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProjects() {
    try {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }

  async function fetchProfiles() {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  }

  function openCreateDialog() {
    setEditingRisk(null);
    setRiskForm({
      project_id: '',
      title: '',
      description: '',
      probability: 'medium',
      impact: 'medium',
      status: 'open',
      mitigation_plan: '',
      owner_id: '',
    });
    setShowDialog(true);
  }

  function openEditDialog(risk: ProjectRisk) {
    setEditingRisk(risk);
    setRiskForm({
      project_id: risk.project_id,
      title: risk.title,
      description: risk.description || '',
      probability: risk.probability,
      impact: risk.impact,
      status: risk.status,
      mitigation_plan: risk.mitigation_plan || '',
      owner_id: risk.owner_id || '',
    });
    setShowDialog(true);
  }

  async function handleSaveRisk() {
    if (!riskForm.title.trim()) {
      toast.error('Risk title is required');
      return;
    }
    if (!riskForm.project_id) {
      toast.error('Project is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        project_id: riskForm.project_id,
        title: riskForm.title.trim(),
        description: riskForm.description.trim() || null,
        probability: riskForm.probability,
        impact: riskForm.impact,
        status: riskForm.status,
        mitigation_plan: riskForm.mitigation_plan.trim() || null,
        owner_id: riskForm.owner_id || null,
        identified_date: editingRisk?.identified_date || new Date().toISOString().split('T')[0],
      };

      if (editingRisk) {
        const { error } = await supabase.from('project_risks').update(payload).eq('id', editingRisk.id);
        if (error) throw error;
        toast.success('Risk updated');
      } else {
        const { error } = await supabase.from('project_risks').insert(payload);
        if (error) throw error;
        toast.success('Risk created');
      }
      setShowDialog(false);
      fetchRisks();
    } catch (err: any) {
      console.error('Error saving risk:', err);
      toast.error(err?.message || 'Failed to save risk');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRisk(riskId: string) {
    try {
      const { error } = await supabase.from('project_risks').delete().eq('id', riskId);
      if (error) throw error;
      toast.success('Risk deleted');
      fetchRisks();
    } catch (err: any) {
      console.error('Error deleting risk:', err);
      toast.error('Failed to delete risk');
    }
  }

  const filteredRisks = useMemo(() => {
    return risks.filter((r) => {
      if (filters.project !== 'all' && r.project_id !== filters.project) return false;
      if (filters.probability !== 'all' && r.probability !== filters.probability) return false;
      if (filters.impact !== 'all' && r.impact !== filters.impact) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      return true;
    });
  }, [risks, filters]);

  const stats = useMemo(() => {
    const open = risks.filter((r) => r.status === 'open').length;
    const mitigating = risks.filter((r) => r.status === 'mitigating').length;
    const closed = risks.filter((r) => r.status === 'closed').length;
    const critical = risks.filter((r) => getRiskScore(r.probability, r.impact) >= 6).length;
    return { total: risks.length, open, mitigating, closed, critical };
  }, [risks]);

  // Matrix data: 3x3 grid (probability x impact)
  const matrix = useMemo(() => {
    const grid: Record<string, ProjectRisk[]> = {};
    const probs: Probability[] = ['high', 'medium', 'low'];
    const impacts: Impact[] = ['low', 'medium', 'high'];
    probs.forEach((p) => impacts.forEach((i) => (grid[`${p}-${i}`] = [])));
    filteredRisks.forEach((r) => {
      const key = `${r.probability}-${r.impact}`;
      if (grid[key]) grid[key].push(r);
    });
    return { grid, probs, impacts };
  }, [filteredRisks]);

  if (loading) {
    return (
      <div>
        <TopBar title="Risk Register" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Risk Register" subtitle="Track and mitigate project risks across the organization" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Risk Register</h1>
            <p className="text-slate-600">Track and mitigate project risks across the organization</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`p-2 ${viewMode === 'matrix' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Risk
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <ShieldAlert className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Total Risks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.open}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.mitigating}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Mitigating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <AlertCircle className="h-5 w-5 text-red-700" />
                <span className="text-2xl font-bold text-slate-900">{stats.critical}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Critical (High P × High I)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Project</Label>
                <Select value={filters.project} onValueChange={(v) => setFilters({ ...filters, project: v })}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Probability</Label>
                <Select value={filters.probability} onValueChange={(v) => setFilters({ ...filters, probability: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Impact</Label>
                <Select value={filters.impact} onValueChange={(v) => setFilters({ ...filters, impact: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filters.project !== 'all' || filters.probability !== 'all' || filters.impact !== 'all' || filters.status !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ project: 'all', probability: 'all', impact: 'all', status: 'all' })}
                  className="mt-5"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRisks} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Matrix View */}
        {!error && viewMode === 'matrix' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Matrix</CardTitle>
              <CardDescription>Probability vs Impact — click a cell to see risks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                  {/* Matrix Grid */}
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1">
                    {/* Top-left corner */}
                    <div className="flex items-center justify-center p-2">
                      <span className="text-xs font-semibold text-slate-500 -rotate-0">Impact →</span>
                    </div>
                    {matrix.impacts.map((impact) => (
                      <div key={impact} className="flex items-center justify-center p-2">
                        <span className="text-xs font-semibold text-slate-600 capitalize">{impact}</span>
                      </div>
                    ))}
                    {/* Rows */}
                    {matrix.probs.map((prob) => (
                      <div key={prob} className="contents">
                        <div className="flex items-center justify-center p-2">
                          <span className="text-xs font-semibold text-slate-600 capitalize">{prob}</span>
                        </div>
                        {matrix.impacts.map((impact) => {
                          const cellRisks = matrix.grid[`${prob}-${impact}`];
                          const score = getRiskScore(prob, impact);
                          const level = getRiskLevel(score);
                          return (
                            <div
                              key={`${prob}-${impact}`}
                              className={`relative rounded-lg border-2 p-3 min-h-[80px] flex flex-col items-center justify-center transition-all hover:shadow-md ${
                                cellRisks.length > 0 ? 'border-slate-300' : 'border-slate-100'
                              } ${level.bg} ${level.bg.includes('red') ? 'bg-opacity-20' : ''}`}
                              style={{ backgroundColor: cellRisks.length > 0 ? `${level.bg.replace('bg-', '').includes('red') ? 'rgb(254 226 226)' : level.bg.includes('amber') ? 'rgb(254 243 199)' : level.bg.includes('blue') ? 'rgb(219 234 254)' : 'rgb(209 250 229)'}` : 'rgb(248 250 252)' }}
                            >
                              <span className={`text-lg font-bold ${level.color}`}>
                                {cellRisks.length > 0 ? cellRisks.length : '—'}
                              </span>
                              <span className="text-[10px] text-slate-500 capitalize">{level.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 justify-center">
                    {['Low', 'Medium', 'High', 'Critical'].map((label, i) => {
                      const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500'];
                      return (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded ${colors[i]}`} />
                          <span className="text-xs text-slate-600">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {!error && viewMode === 'list' && filteredRisks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No risks found</p>
              <p className="text-sm text-slate-400 mb-4">
                {risks.length === 0 ? 'Register your first risk to get started' : 'Try adjusting your filters'}
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Risk
              </Button>
            </CardContent>
          </Card>
        ) : !error && viewMode === 'list' && filteredRisks.length > 0 ? (
          <div className="space-y-3">
            {filteredRisks.map((risk) => {
                const score = getRiskScore(risk.probability, risk.impact);
                const level = getRiskLevel(score);
                const sCfg = statusConfig[risk.status];
                const StatusIcon = sCfg.icon;
                return (
                  <Card key={risk.id}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 rounded-lg bg-slate-50 flex-shrink-0">
                            <ShieldAlert className={`h-5 w-5 ${level.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">{risk.title}</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge className={level.color.includes('red') ? 'bg-red-100 text-red-700' : level.color.includes('amber') ? 'bg-amber-100 text-amber-700' : level.color.includes('blue') ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                                {level.label} (Score: {score})
                              </Badge>
                              <Badge className={probabilityConfig[risk.probability].badge}>
                                P: {probabilityConfig[risk.probability].label}
                              </Badge>
                              <Badge className={impactConfig[risk.impact].badge}>
                                I: {impactConfig[risk.impact].label}
                              </Badge>
                              <Badge className={sCfg.badge}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {sCfg.label}
                              </Badge>
                              {risk.project?.name && (
                                <span className="text-xs text-slate-500">· {risk.project.name}</span>
                              )}
                              {risk.owner?.full_name && (
                                <span className="text-xs text-slate-500">· {risk.owner.full_name}</span>
                              )}
                            </div>
                            {risk.description && (
                              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{risk.description}</p>
                            )}
                            {risk.mitigation_plan && (
                              <div className="mt-2 bg-blue-50 rounded-lg p-2.5">
                                <p className="text-xs font-semibold text-blue-700 mb-0.5">Mitigation Plan</p>
                                <p className="text-sm text-blue-900 line-clamp-2">{risk.mitigation_plan}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => openEditDialog(risk)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRisk(risk.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : null}
      </div>

      {/* Create/Edit Risk Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Edit Risk' : 'Register New Risk'}</DialogTitle>
            <DialogDescription>
              {editingRisk ? 'Update risk details and mitigation plan' : 'Identify a new project risk with mitigation plan'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Risk Title</Label>
              <Input
                value={riskForm.title}
                onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                placeholder="e.g. Key team member may leave"
              />
            </div>
            <div>
              <Label>Project</Label>
              <Select
                value={riskForm.project_id}
                onValueChange={(v) => setRiskForm({ ...riskForm, project_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={riskForm.description}
                onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                placeholder="Describe the risk in detail..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Probability</Label>
                <Select
                  value={riskForm.probability}
                  onValueChange={(v: Probability) => setRiskForm({ ...riskForm, probability: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impact</Label>
                <Select
                  value={riskForm.impact}
                  onValueChange={(v: Impact) => setRiskForm({ ...riskForm, impact: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={riskForm.status}
                  onValueChange={(v: RiskStatus) => setRiskForm({ ...riskForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Owner</Label>
              <Select
                value={riskForm.owner_id || 'none'}
                onValueChange={(v) => setRiskForm({ ...riskForm, owner_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mitigation Plan</Label>
              <Textarea
                value={riskForm.mitigation_plan}
                onChange={(e) => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                placeholder="How will this risk be mitigated or managed?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRisk} disabled={submitting}>
              {submitting ? 'Saving...' : editingRisk ? 'Update Risk' : 'Create Risk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
