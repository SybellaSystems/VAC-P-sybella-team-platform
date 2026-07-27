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
import { TrendingUp, DollarSign, Trophy, Circle as XCircle, Plus, Pencil, Trash2, Phone, Mail, CalendarClock, StickyNote, Presentation, FileText, Loader as Loader2, CircleAlert as AlertCircle, X, ChevronRight, User, Target } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

interface Opportunity {
  id: string;
  name: string;
  customer_id: string | null;
  stage: Stage;
  value: number;
  probability: number;
  expected_close_date: string | null;
  source: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; company: string | null } | null;
}

interface SalesActivity {
  id: string;
  opportunity_id: string;
  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'demo' | 'proposal_sent';
  subject: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  created_by_profile?: { full_name: string } | null;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
}

const STAGES: { key: Stage; label: string; color: string; dot: string }[] = [
  { key: 'lead', label: 'Lead', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { key: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
];

const ACTIVITY_TYPES: {
  key: SalesActivity['activity_type'];
  label: string;
  icon: typeof Phone;
  color: string;
}[] = [
  { key: 'call', label: 'Call', icon: Phone, color: 'text-blue-600' },
  { key: 'email', label: 'Email', icon: Mail, color: 'text-purple-600' },
  { key: 'meeting', label: 'Meeting', icon: CalendarClock, color: 'text-amber-600' },
  { key: 'note', label: 'Note', icon: StickyNote, color: 'text-slate-600' },
  { key: 'demo', label: 'Demo', icon: Presentation, color: 'text-emerald-600' },
  { key: 'proposal_sent', label: 'Proposal Sent', icon: FileText, color: 'text-indigo-600' },
];

const SOURCES = ['Website', 'Referral', 'Cold Outreach', 'Event', 'Social Media', 'Partner', 'Inbound'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isThisMonth(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const emptyForm = {
  name: '',
  customer_id: '',
  stage: 'lead' as Stage,
  value: '',
  probability: '20',
  expected_close_date: '',
  source: 'Website',
  description: '',
};

export default function SalesPipelinePage() {
  const { profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showOppDialog, setShowOppDialog] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [newActivity, setNewActivity] = useState({ activity_type: 'note' as SalesActivity['activity_type'], subject: '', description: '' });
  const [addingActivity, setAddingActivity] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oppRes, custRes] = await Promise.all([
        supabase
          .from('sales_opportunities')
          .select('*, customer:customers!sales_opportunities_customer_id_fkey(id, name, company)')
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, name, company').order('name', { ascending: true }),
      ]);

      if (oppRes.error) throw oppRes.error;
      if (custRes.error) throw custRes.error;

      setOpportunities((oppRes.data as Opportunity[]) || []);
      setCustomers((custRes.data as Customer[]) || []);
    } catch (err: any) {
      console.error('Error fetching sales pipeline:', err);
      setError(err?.message || 'Failed to load sales pipeline');
      toast.error('Failed to load sales pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadActivities = useCallback(async (oppId: string) => {
    try {
      const { data, error: actErr } = await supabase
        .from('sales_activities')
        .select('*, created_by_profile:profiles!sales_activities_created_by_fkey(full_name)')
        .eq('opportunity_id', oppId)
        .order('created_at', { ascending: false });
      if (actErr) throw actErr;
      setActivities((data as SalesActivity[]) || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      toast.error('Failed to load activities');
      setActivities([]);
    }
  }, []);

  function openCreate() {
    setEditingOpp(null);
    setForm({ ...emptyForm });
    setShowOppDialog(true);
  }

  function openEdit(opp: Opportunity) {
    setEditingOpp(opp);
    setForm({
      name: opp.name || '',
      customer_id: opp.customer_id || '',
      stage: opp.stage || 'lead',
      value: opp.value != null ? String(opp.value) : '',
      probability: opp.probability != null ? String(opp.probability) : '20',
      expected_close_date: opp.expected_close_date || '',
      source: opp.source || 'Website',
      description: opp.description || '',
    });
    setShowOppDialog(true);
  }

  async function handleSaveOpp() {
    if (!form.name.trim()) {
      toast.error('Opportunity name is required');
      return;
    }
    if (!form.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    const valueNum = parseFloat(form.value);
    if (isNaN(valueNum) || valueNum < 0) {
      toast.error('Please enter a valid deal value');
      return;
    }
    const probNum = parseInt(form.probability, 10);
    if (isNaN(probNum) || probNum < 0 || probNum > 100) {
      toast.error('Probability must be between 0 and 100');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        customer_id: form.customer_id,
        stage: form.stage,
        value: valueNum,
        probability: probNum,
        expected_close_date: form.expected_close_date || null,
        source: form.source,
        description: form.description.trim() || null,
      };

      if (editingOpp) {
        const { error: upErr } = await supabase
          .from('sales_opportunities')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingOpp.id);
        if (upErr) throw upErr;
        toast.success('Opportunity updated');
      } else {
        const { error: inErr } = await supabase
          .from('sales_opportunities')
          .insert({ ...payload, created_by: profile?.id || null });
        if (inErr) throw inErr;
        toast.success('Opportunity created');
      }
      setShowOppDialog(false);
      setEditingOpp(null);
      setForm({ ...emptyForm });
      await loadAll();
    } catch (err: any) {
      console.error('Error saving opportunity:', err);
      toast.error(err?.message || 'Failed to save opportunity');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteOpp(opp: Opportunity) {
    if (!confirm(`Delete opportunity "${opp.name}"? This cannot be undone.`)) return;
    try {
      const { error: delErr } = await supabase.from('sales_opportunities').delete().eq('id', opp.id);
      if (delErr) throw delErr;
      toast.success('Opportunity deleted');
      if (detailOpp?.id === opp.id) {
        setShowDetailDialog(false);
        setDetailOpp(null);
      }
      await loadAll();
    } catch (err: any) {
      console.error('Error deleting opportunity:', err);
      toast.error(err?.message || 'Failed to delete opportunity');
    }
  }

  async function handleMoveStage(oppId: string, newStage: Stage) {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.stage === newStage) return;
    const newProb = newStage === 'closed_won' ? 100 : newStage === 'closed_lost' ? 0 : opp.probability;
    try {
      const { error: mvErr } = await supabase
        .from('sales_opportunities')
        .update({ stage: newStage, probability: newProb, updated_at: new Date().toISOString() })
        .eq('id', oppId);
      if (mvErr) throw mvErr;
      setOpportunities((prev) => prev.map((o) => (o.id === oppId ? { ...o, stage: newStage, probability: newProb } : o)));
      if (detailOpp?.id === oppId) setDetailOpp((d) => (d ? { ...d, stage: newStage, probability: newProb } : d));
      toast.success(`Moved to ${STAGES.find((s) => s.key === newStage)?.label}`);
    } catch (err: any) {
      console.error('Error moving opportunity:', err);
      toast.error('Failed to update stage');
    }
  }

  async function openDetail(opp: Opportunity) {
    setDetailOpp(opp);
    setShowDetailDialog(true);
    await loadActivities(opp.id);
  }

  async function handleAddActivity() {
    if (!detailOpp) return;
    if (!newActivity.subject.trim()) {
      toast.error('Activity subject is required');
      return;
    }
    setAddingActivity(true);
    try {
      const { data, error: actErr } = await supabase
        .from('sales_activities')
        .insert({
          opportunity_id: detailOpp.id,
          activity_type: newActivity.activity_type,
          subject: newActivity.subject.trim(),
          description: newActivity.description.trim() || null,
          created_by: profile?.id || null,
        })
        .select('*, created_by_profile:profiles!sales_activities_created_by_fkey(full_name)')
        .single();
      if (actErr) throw actErr;
      setActivities((prev) => [data as SalesActivity, ...prev]);
      setNewActivity({ activity_type: 'note', subject: '', description: '' });
      toast.success('Activity logged');
    } catch (err: any) {
      console.error('Error adding activity:', err);
      toast.error(err?.message || 'Failed to log activity');
    } finally {
      setAddingActivity(false);
    }
  }

  async function handleDeleteActivity(actId: string) {
    try {
      const { error: delErr } = await supabase.from('sales_activities').delete().eq('id', actId);
      if (delErr) throw delErr;
      setActivities((prev) => prev.filter((a) => a.id !== actId));
      toast.success('Activity removed');
    } catch (err: any) {
      console.error('Error deleting activity:', err);
      toast.error('Failed to remove activity');
    }
  }

  const stats = useMemo(() => {
    const open = opportunities.filter((o) => o.stage !== 'closed_won' && o.stage !== 'closed_lost');
    const totalPipeline = open.reduce((sum, o) => sum + (o.value || 0), 0);
    const weighted = open.reduce((sum, o) => sum + (o.value || 0) * ((o.probability || 0) / 100), 0);
    const wonThisMonth = opportunities.filter((o) => o.stage === 'closed_won' && isThisMonth(o.updated_at)).length;
    const lostThisMonth = opportunities.filter((o) => o.stage === 'closed_lost' && isThisMonth(o.updated_at)).length;
    return { totalPipeline, weighted, wonThisMonth, lostThisMonth };
  }, [opportunities]);

  const byStage = useMemo(() => {
    const map: Record<Stage, Opportunity[]> = {
      lead: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      closed_won: [],
      closed_lost: [],
    };
    opportunities.forEach((o) => {
      if (map[o.stage]) map[o.stage].push(o);
    });
    return map;
  }, [opportunities]);

  if (loading) {
    return (
      <div>
        <TopBar title="Sales Pipeline" subtitle="Track deals and sales opportunities" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Sales Pipeline" subtitle="Track deals and sales opportunities" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Pipeline Value</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(stats.totalPipeline)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" /> Open deals
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Weighted Pipeline</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(stats.weighted)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <TrendingUp className="h-4 w-4 mr-1 text-blue-600" /> Value × probability
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Won This Month</CardDescription>
              <CardTitle className="text-2xl">{stats.wonThisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <Trophy className="h-4 w-4 mr-1 text-emerald-600" /> Closed won
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lost This Month</CardDescription>
              <CardTitle className="text-2xl">{stats.lostThisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-slate-500">
                <XCircle className="h-4 w-4 mr-1 text-red-600" /> Closed lost
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
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Pipeline Board</h2>
            <p className="text-sm text-slate-500">{opportunities.length} opportunities across {STAGES.length} stages</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Opportunity
          </Button>
        </div>

        {/* Kanban board */}
        {opportunities.length === 0 && !error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-1">No opportunities yet</p>
              <p className="text-sm text-slate-400 mb-4">Create your first opportunity to start tracking deals</p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Opportunity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STAGES.map((stage) => {
                const items = byStage[stage.key];
                const stageValue = items.reduce((sum, o) => sum + (o.value || 0), 0);
                return (
                  <div key={stage.key} className="w-72 sm:w-80 flex-shrink-0">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 flex flex-col max-h-[calc(100vh-280px)]">
                      <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                          <span className="font-semibold text-sm text-slate-700">{stage.label}</span>
                          <Badge variant="secondary" className="h-5 text-xs">
                            {items.length}
                          </Badge>
                        </div>
                        <span className="text-xs font-medium text-slate-500">{formatCurrency(stageValue)}</span>
                      </div>
                      <div className="p-2 space-y-2 overflow-y-auto flex-1">
                        {items.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400">No deals</div>
                        ) : (
                          items.map((opp) => (
                            <div
                              key={opp.id}
                              className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                              onClick={() => openDetail(opp)}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="font-medium text-sm text-slate-800 line-clamp-2">{opp.name}</p>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEdit(opp);
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 text-slate-500"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteOpp(opp);
                                    }}
                                    className="p-1 rounded hover:bg-red-50 text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                                <User className="h-3 w-3" />
                                <span className="truncate">{opp.customer?.name || opp.customer?.company || 'No customer'}</span>
                              </div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm text-slate-900">{formatCurrency(opp.value)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {opp.probability}%
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {formatDate(opp.expected_close_date)}
                                </span>
                                <span className="truncate ml-2">{opp.source || '—'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Create / Edit dialog */}
        <Dialog open={showOppDialog} onOpenChange={setShowOppDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOpp ? 'Edit Opportunity' : 'New Opportunity'}</DialogTitle>
              <DialogDescription>
                {editingOpp ? 'Update the details of this deal' : 'Create a new sales opportunity to track'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="opp-name">Opportunity Name</Label>
                <Input
                  id="opp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Annual subscription renewal"
                />
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No customers available
                      </SelectItem>
                    ) : (
                      customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` — ${c.company}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as Stage })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="opp-source">Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opp-value">Deal Value ($)</Label>
                  <Input
                    id="opp-value"
                    type="number"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="opp-prob">Probability (%)</Label>
                  <Input
                    id="opp-prob"
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="opp-close">Expected Close Date</Label>
                <Input
                  id="opp-close"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="opp-desc">Description</Label>
                <Textarea
                  id="opp-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Notes about this deal..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOppDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveOpp} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOpp ? 'Save Changes' : 'Create Opportunity'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">{detailOpp?.name}</DialogTitle>
              <DialogDescription>
                {detailOpp?.customer?.name}
                {detailOpp?.customer?.company ? ` — ${detailOpp.customer.company}` : ''}
              </DialogDescription>
            </DialogHeader>

            {detailOpp && (
              <div className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Value</p>
                    <p className="font-bold text-slate-900">{formatCurrency(detailOpp.value)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Probability</p>
                    <p className="font-bold text-slate-900">{detailOpp.probability}%</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Weighted</p>
                    <p className="font-bold text-slate-900">
                      {formatCurrency(detailOpp.value * (detailOpp.probability / 100))}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Close Date</p>
                    <p className="font-bold text-slate-900 text-sm">{formatDate(detailOpp.expected_close_date)}</p>
                  </div>
                </div>

                {/* Stage mover */}
                <div>
                  <Label className="mb-2 block">Move to Stage</Label>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.map((s) => (
                      <Button
                        key={s.key}
                        size="sm"
                        variant={detailOpp.stage === s.key ? 'default' : 'outline'}
                        onClick={() => handleMoveStage(detailOpp.id, s.key)}
                      >
                        <span className={`w-2 h-2 rounded-full ${s.dot} mr-1.5`} />
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {detailOpp.description && (
                  <div>
                    <Label className="mb-1 block">Description</Label>
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{detailOpp.description}</p>
                  </div>
                )}

                {/* Add activity */}
                <div className="border-t border-slate-200 pt-4">
                  <Label className="mb-2 block">Log Sales Activity</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select
                        value={newActivity.activity_type}
                        onValueChange={(v) => setNewActivity({ ...newActivity, activity_type: v as SalesActivity['activity_type'] })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((a) => (
                            <SelectItem key={a.key} value={a.key}>
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={newActivity.subject}
                        onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                        placeholder="Subject..."
                        className="flex-1"
                      />
                    </div>
                    <Textarea
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                      placeholder="Activity details (optional)..."
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleAddActivity} disabled={addingActivity}>
                        {addingActivity && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Log Activity
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Activity timeline */}
                <div className="border-t border-slate-200 pt-4">
                  <Label className="mb-2 block">Activity Timeline</Label>
                  {activities.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No activities logged yet</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {activities.map((act) => {
                        const cfg = ACTIVITY_TYPES.find((a) => a.key === act.activity_type);
                        const Icon = cfg?.icon || StickyNote;
                        return (
                          <div key={act.id} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                            <div className={`rounded-lg bg-slate-100 p-2 flex-shrink-0`}>
                              <Icon className={`h-4 w-4 ${cfg?.color || 'text-slate-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{act.subject}</p>
                                <button
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {act.description && <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>}
                              <p className="text-xs text-slate-400 mt-1">
                                {cfg?.label} · {act.created_by_profile?.full_name || 'System'} ·{' '}
                                {new Date(act.created_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  if (detailOpp) openEdit(detailOpp);
                  setShowDetailDialog(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                <ChevronRight className="mr-2 h-4 w-4" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
