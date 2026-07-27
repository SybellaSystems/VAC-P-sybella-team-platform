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
import { Target, Plus, TrendingUp, Building2, Users, User, Calendar, ChevronDown, ChevronRight, KeyRound, Trash2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type ObjectiveLevel = 'company' | 'department' | 'team' | 'individual';

interface Objective {
  id: string;
  title: string;
  description: string | null;
  level: ObjectiveLevel;
  quarter: string;
  year: number;
  owner_id: string | null;
  status: string;
  created_at: string;
  owner?: { full_name: string } | null;
  key_results?: KeyResult[];
}

interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  metric_type: string;
  current_value: number;
  target_value: number;
  created_at: string;
}

const levelConfig: Record<ObjectiveLevel, { label: string; icon: typeof Building2; color: string; badge: string }> = {
  company: { label: 'Company', icon: Building2, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' },
  department: { label: 'Department', icon: Users, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-800' },
  team: { label: 'Team', icon: Users, color: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-800' },
  individual: { label: 'Individual', icon: User, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-800' },
};

const statusConfig: Record<string, { label: string; badge: string }> = {
  on_track: { label: 'On Track', badge: 'bg-emerald-100 text-emerald-800' },
  at_risk: { label: 'At Risk', badge: 'bg-amber-100 text-amber-800' },
  behind: { label: 'Behind', badge: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', badge: 'bg-blue-100 text-blue-800' },
};

function calcProgress(krs: KeyResult[]): number {
  if (!krs || krs.length === 0) return 0;
  const total = krs.reduce((sum, kr) => {
    const pct = kr.target_value > 0 ? Math.min(100, (kr.current_value / kr.target_value) * 100) : 0;
    return sum + pct;
  }, 0);
  return Math.round(total / krs.length);
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  if (pct > 0) return 'bg-blue-500';
  return 'bg-slate-300';
}

export default function GoalsPage() {
  const { profile } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false);
  const [showKRDialog, setShowKRDialog] = useState(false);
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newObjective, setNewObjective] = useState({
    title: '',
    description: '',
    level: 'company' as ObjectiveLevel,
    quarter: 'Q1',
    year: new Date().getFullYear(),
    owner_id: '',
    status: 'on_track',
  });

  const [newKR, setNewKR] = useState({
    title: '',
    metric_type: 'percentage',
    current_value: 0,
    target_value: 100,
  });

  useEffect(() => {
    if (profile) fetchObjectives();
  }, [profile]);

  async function fetchObjectives() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('objectives')
        .select('*, owner:profiles!objectives_owner_id_fkey(full_name), key_results(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setObjectives((data as Objective[]) || []);
    } catch (err: any) {
      console.error('Error fetching objectives:', err);
      setError(err?.message || 'Failed to load objectives');
      toast.error('Failed to load objectives');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateObjective() {
    if (!newObjective.title.trim()) {
      toast.error('Objective title is required');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('objectives').insert({
        title: newObjective.title.trim(),
        description: newObjective.description.trim() || null,
        level: newObjective.level,
        quarter: newObjective.quarter,
        year: newObjective.year,
        owner_id: newObjective.owner_id || profile?.id || null,
        status: newObjective.status,
      });
      if (error) throw error;
      toast.success('Objective created');
      setShowObjectiveDialog(false);
      setNewObjective({
        title: '',
        description: '',
        level: 'company',
        quarter: 'Q1',
        year: new Date().getFullYear(),
        owner_id: '',
        status: 'on_track',
      });
      fetchObjectives();
    } catch (err: any) {
      console.error('Error creating objective:', err);
      toast.error(err?.message || 'Failed to create objective');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateKR() {
    if (!activeObjectiveId) return;
    if (!newKR.title.trim()) {
      toast.error('Key result title is required');
      return;
    }
    if (newKR.target_value <= 0) {
      toast.error('Target value must be greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('key_results').insert({
        objective_id: activeObjectiveId,
        title: newKR.title.trim(),
        metric_type: newKR.metric_type,
        current_value: newKR.current_value,
        target_value: newKR.target_value,
      });
      if (error) throw error;
      toast.success('Key result added');
      setShowKRDialog(false);
      setNewKR({ title: '', metric_type: 'percentage', current_value: 0, target_value: 100 });
      fetchObjectives();
    } catch (err: any) {
      console.error('Error creating key result:', err);
      toast.error(err?.message || 'Failed to add key result');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateKRValue(krId: string, currentValue: number) {
    try {
      const { error } = await supabase
        .from('key_results')
        .update({ current_value: currentValue })
        .eq('id', krId);
      if (error) throw error;
      fetchObjectives();
    } catch (err: any) {
      console.error('Error updating key result:', err);
      toast.error('Failed to update progress');
    }
  }

  async function handleDeleteKR(krId: string) {
    try {
      const { error } = await supabase.from('key_results').delete().eq('id', krId);
      if (error) throw error;
      toast.success('Key result removed');
      fetchObjectives();
    } catch (err: any) {
      console.error('Error deleting key result:', err);
      toast.error('Failed to remove key result');
    }
  }

  const filteredObjectives = useMemo(() => {
    if (filterLevel === 'all') return objectives;
    return objectives.filter((o) => o.level === filterLevel);
  }, [objectives, filterLevel]);

  const stats = useMemo(() => {
    const levels: ObjectiveLevel[] = ['company', 'department', 'team', 'individual'];
    return levels.map((level) => {
      const items = objectives.filter((o) => o.level === level);
      const avgProgress =
        items.length > 0
          ? Math.round(items.reduce((sum, o) => sum + calcProgress(o.key_results || []), 0) / items.length)
          : 0;
      return { level, count: items.length, avgProgress };
    });
  }, [objectives]);

  if (loading) {
    return (
      <div>
        <TopBar title="Goals & OKRs" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Goals & OKRs" subtitle="Track objectives and key results across the organization" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Goals & OKRs</h1>
            <p className="text-slate-600">Track objectives and key results across the organization</p>
          </div>
          <Dialog open={showObjectiveDialog} onOpenChange={setShowObjectiveDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Objective
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Objective</DialogTitle>
                <DialogDescription>Define a new objective with level, quarter, and owner</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Objective Title</Label>
                  <Input
                    value={newObjective.title}
                    onChange={(e) => setNewObjective({ ...newObjective, title: e.target.value })}
                    placeholder="e.g. Increase market share"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newObjective.description}
                    onChange={(e) => setNewObjective({ ...newObjective, description: e.target.value })}
                    placeholder="Optional context for this objective"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Level</Label>
                    <Select
                      value={newObjective.level}
                      onValueChange={(v: ObjectiveLevel) => setNewObjective({ ...newObjective, level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={newObjective.status}
                      onValueChange={(v) => setNewObjective({ ...newObjective, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="on_track">On Track</SelectItem>
                        <SelectItem value="at_risk">At Risk</SelectItem>
                        <SelectItem value="behind">Behind</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Quarter</Label>
                    <Select
                      value={newObjective.quarter}
                      onValueChange={(v) => setNewObjective({ ...newObjective, quarter: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q1">Q1</SelectItem>
                        <SelectItem value="Q2">Q2</SelectItem>
                        <SelectItem value="Q3">Q3</SelectItem>
                        <SelectItem value="Q4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={newObjective.year}
                      onChange={(e) => setNewObjective({ ...newObjective, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    />
                  </div>
                  <div>
                    <Label>Owner</Label>
                    <Input
                      value={newObjective.owner_id}
                      onChange={(e) => setNewObjective({ ...newObjective, owner_id: e.target.value })}
                      placeholder="User ID (optional)"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowObjectiveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateObjective} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Objective'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const cfg = levelConfig[stat.level];
            const Icon = cfg.icon;
            return (
              <Card key={stat.level}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-slate-50`}>
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{stat.count}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{cfg.label} Objectives</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(stat.avgProgress)}`}
                        style={{ width: `${stat.avgProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{stat.avgProgress}%</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-600">Filter:</span>
          <Button
            variant={filterLevel === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterLevel('all')}
          >
            All ({objectives.length})
          </Button>
          {(['company', 'department', 'team', 'individual'] as ObjectiveLevel[]).map((level) => {
            const cfg = levelConfig[level];
            const Icon = cfg.icon;
            const count = objectives.filter((o) => o.level === level).length;
            return (
              <Button
                key={level}
                variant={filterLevel === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterLevel(level)}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label} ({count})
              </Button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchObjectives} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Objectives List */}
        {!error && filteredObjectives.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No objectives found</p>
              <p className="text-sm text-slate-400 mb-4">
                {filterLevel === 'all'
                  ? 'Create your first objective to get started'
                  : `No ${levelConfig[filterLevel as ObjectiveLevel].label.toLowerCase()} objectives yet`}
              </p>
              <Button onClick={() => setShowObjectiveDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Objective
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredObjectives.map((objective) => {
              const cfg = levelConfig[objective.level];
              const Icon = cfg.icon;
              const progress = calcProgress(objective.key_results || []);
              const isExpanded = expandedId === objective.id;
              const statusCfg = statusConfig[objective.status] || statusConfig.on_track;
              return (
                <Card key={objective.id}>
                  <CardContent className="p-4 sm:p-5">
                    <div
                      className="flex items-start justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : objective.id)}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-lg bg-slate-50 flex-shrink-0">
                          <Icon className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{objective.title}</h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge className={cfg.badge}>{cfg.label}</Badge>
                            <Badge className={statusCfg.badge}>{statusCfg.label}</Badge>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {objective.quarter} {objective.year}
                            </span>
                            {objective.owner?.full_name && (
                              <span className="text-xs text-slate-500">· {objective.owner.full_name}</span>
                            )}
                          </div>
                          {objective.description && (
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{objective.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 min-w-[3rem] text-right">{progress}%</span>
                    </div>

                    {/* Key Results (expanded) */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                            <KeyRound className="h-4 w-4" />
                            Key Results ({objective.key_results?.length || 0})
                          </h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveObjectiveId(objective.id);
                              setShowKRDialog(true);
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add KR
                          </Button>
                        </div>

                        {objective.key_results && objective.key_results.length > 0 ? (
                          <div className="space-y-2">
                            {objective.key_results.map((kr) => {
                              const krPct =
                                kr.target_value > 0
                                  ? Math.min(100, Math.round((kr.current_value / kr.target_value) * 100))
                                  : 0;
                              return (
                                <div key={kr.id} className="bg-slate-50 rounded-lg p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800">{kr.title}</p>
                                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                                        {kr.metric_type} · {kr.current_value} / {kr.target_value}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-semibold text-slate-600">{krPct}%</span>
                                      {krPct >= 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteKR(kr.id);
                                        }}
                                        className="text-slate-400 hover:text-red-500"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${getProgressColor(krPct)}`}
                                        style={{ width: `${krPct}%` }}
                                      />
                                    </div>
                                    <Input
                                      type="number"
                                      value={kr.current_value}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const val = parseFloat(e.target.value) || 0;
                                        handleUpdateKRValue(kr.id, val);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-20 h-7 text-xs"
                                      step="any"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 text-center py-4">
                            No key results yet. Add one to start tracking progress.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Key Result Dialog */}
      <Dialog open={showKRDialog} onOpenChange={setShowKRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Key Result</DialogTitle>
            <DialogDescription>Define a measurable key result for this objective</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key Result Title</Label>
              <Input
                value={newKR.title}
                onChange={(e) => setNewKR({ ...newKR, title: e.target.value })}
                placeholder="e.g. Achieve 95% customer satisfaction"
              />
            </div>
            <div>
              <Label>Metric Type</Label>
              <Select
                value={newKR.metric_type}
                onValueChange={(v) => setNewKR({ ...newKR, metric_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency ($)</SelectItem>
                  <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Value</Label>
                <Input
                  type="number"
                  value={newKR.current_value}
                  onChange={(e) => setNewKR({ ...newKR, current_value: parseFloat(e.target.value) || 0 })}
                  step="any"
                />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={newKR.target_value}
                  onChange={(e) => setNewKR({ ...newKR, target_value: parseFloat(e.target.value) || 0 })}
                  step="any"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKRDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKR} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Key Result'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
