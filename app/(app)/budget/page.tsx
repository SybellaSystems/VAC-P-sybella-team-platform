'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { BudgetProposal, Project } from '@/lib/database.types';
import { Plus, Wallet, TrendingUp, DollarSign, X, FolderKanban, ExternalLink, Check, Clock, Ban, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { color: 'bg-emerald-100 text-emerald-700', icon: Check },
  rejected: { color: 'bg-red-100 text-red-700', icon: Ban },
  implemented: { color: 'bg-blue-100 text-blue-700', icon: Check },
  cancelled: { color: 'bg-gray-100 text-gray-600', icon: X },
};

const priorityColors: Record<string, string> = { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' };

const emptyForm = () => ({
  title: '', description: '', amount: '', currency: 'USD', category: 'general',
  project_id: '', priority: 'medium', impact_analysis: '',
});

export default function BudgetPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetProposal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canManage = ['admin', 'director', 'finance', 'manager'].includes(profile?.role || '');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: bps }, { data: projs }] = await Promise.all([
      supabase.from('budget_proposals').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('name'),
    ]);
    setBudgets((bps as BudgetProposal[]) || []);
    setProjects((projs as Project[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.amount) return;
    setSaving(true);
    const { error } = await supabase.from('budget_proposals').insert({
      title: form.title, description: form.description, amount: parseFloat(form.amount),
      currency: form.currency, category: form.category, project_id: form.project_id || null,
      proposed_by: profile?.id, priority: form.priority, impact_analysis: form.impact_analysis,
      status: 'pending', current_step: 1, total_steps: 4,
    });
    if (error) { toast.error('Failed: ' + error.message); setSaving(false); return; }
    if (form.project_id) {
      await supabase.from('project_activity_log').insert({
        project_id: form.project_id, action: 'budget_proposal_submitted',
        description: `Budget proposal "${form.title}" (${form.currency} ${form.amount}) submitted by ${profile?.full_name || 'Unknown'}`,
        actor_id: profile?.id || null,
      });
    }
    await loadAll();
    setSaving(false); setShowModal(false); setForm(emptyForm());
    toast.success('Budget proposal submitted');
  };

  const approveBudget = async (id: string, title: string, projectId: string | null) => {
    const { error } = await supabase.from('budget_proposals').update({
      status: 'approved', approved_by: profile?.id, approved_at: new Date().toISOString(),
      current_step: 4,
    }).eq('id', id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    if (projectId) {
      await supabase.from('project_activity_log').insert({
        project_id: projectId, action: 'budget_proposal_approved',
        description: `Budget proposal "${title}" approved by ${profile?.full_name}`,
        actor_id: profile?.id || null,
      });
    }
    toast.success('Budget proposal approved');
    loadAll();
  };

  const rejectBudget = async (id: string, title: string, projectId: string | null) => {
    const { error } = await supabase.from('budget_proposals').update({
      status: 'rejected', rejected_by: profile?.id, rejected_at: new Date().toISOString(),
      rejection_reason: rejectReason,
    }).eq('id', id);
    if (error) { toast.error('Failed: ' + error.message); return; }
    if (projectId) {
      await supabase.from('project_activity_log').insert({
        project_id: projectId, action: 'budget_proposal_rejected',
        description: `Budget proposal "${title}" rejected by ${profile?.full_name}. Reason: ${rejectReason}`,
        actor_id: profile?.id || null,
      });
    }
    setRejectingId(null); setRejectReason('');
    toast.success('Budget proposal rejected');
    loadAll();
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const totalProposed = budgets.reduce((s, b) => s + b.amount, 0);
  const totalApproved = budgets.filter(b => b.status === 'approved').reduce((s, b) => s + b.amount, 0);
  const totalPending = budgets.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0);

  const filtered = budgets.filter(b => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchProject = filterProject === 'all' || b.project_id === filterProject;
    return matchStatus && matchProject;
  });

  return (
    <div>
      <TopBar title="Budget Proposals" subtitle="Propose, approve, and track project-linked budgets" />
      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Proposed', value: `$${totalProposed.toLocaleString()}`, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Approved', value: `$${totalApproved.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: `$${totalPending.toLocaleString()}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Proposals', value: budgets.length, icon: Wallet, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}><Icon size={20} className={color} /></div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['pending', 'approved', 'rejected', 'implemented', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90">
            <Plus size={16} /> New Proposal
          </button>
        </div>

        {/* Proposals List */}
        <div className="space-y-3">
          {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse"><div className="h-5 bg-muted rounded w-1/3 mb-2" /><div className="h-4 bg-muted rounded w-1/2" /></div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-12 text-center">
              <Wallet size={40} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">No budget proposals found.</p>
            </div>
          )}
          {filtered.map(budget => {
            const proj = budget.project_id ? projectMap.get(budget.project_id) : null;
            const statusCfg = statusConfig[budget.status] || statusConfig.pending;
            const StatusIcon = statusCfg.icon;
            const isExpanded = expandedId === budget.id;
            return (
              <div key={budget.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground text-sm">{budget.title}</h3>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusCfg.color} flex items-center gap-1`}>
                          <StatusIcon size={10} /> {budget.status}
                        </span>
                        <span className={`text-[10px] font-semibold ${priorityColors[budget.priority]}`}>{budget.priority} priority</span>
                      </div>
                      <p className="text-lg font-bold text-foreground mt-1">{budget.currency} {budget.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{budget.category}</span>
                        {proj && (
                          <button onClick={() => router.push(`/projects/${proj.id}`)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <FolderKanban size={11} /> {proj.name} <ExternalLink size={9} />
                          </button>
                        )}
                        <span className="text-xs text-muted-foreground">Step {budget.current_step}/{budget.total_steps}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => setExpandedId(isExpanded ? null : budget.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-input rounded-lg hover:bg-muted">
                        <Eye size={12} /> Details {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {canManage && budget.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => approveBudget(budget.id, budget.title, budget.project_id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                            <Check size={12} /> Approve
                          </button>
                          <button onClick={() => setRejectingId(budget.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">
                            <Ban size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0 space-y-3 border-t border-border">
                    {budget.description && (
                      <div className="pt-3"><p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                        <p className="text-sm text-foreground">{budget.description}</p></div>
                    )}
                    {budget.impact_analysis && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-1">Impact Analysis</p>
                        <p className="text-sm text-foreground">{budget.impact_analysis}</p></div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium text-foreground">{budget.category}</p></div>
                      <div><p className="text-xs text-muted-foreground">Priority</p><p className="text-sm font-medium text-foreground capitalize">{budget.priority}</p></div>
                      <div><p className="text-xs text-muted-foreground">Currency</p><p className="text-sm font-medium text-foreground">{budget.currency}</p></div>
                      <div><p className="text-xs text-muted-foreground">Approval Step</p><p className="text-sm font-medium text-foreground">{budget.current_step} of {budget.total_steps}</p></div>
                    </div>
                    {budget.approved_at && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 pt-2"><Check size={12} />
                        Approved on {new Date(budget.approved_at).toLocaleString()}</div>
                    )}
                    {budget.rejected_at && (
                      <div className="flex items-start gap-2 text-xs text-red-600 pt-2"><Ban size={12} className="mt-0.5" />
                        <div>Rejected on {new Date(budget.rejected_at).toLocaleString()}
                          {budget.rejection_reason && <p className="mt-0.5">Reason: {budget.rejection_reason}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reject Reason Input */}
                {rejectingId === budget.id && (
                  <div className="px-5 pb-5 pt-3 border-t border-border">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Rejection Reason</label>
                    <div className="flex gap-2">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Explain why this proposal is rejected..."
                        className="flex-1 px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={() => rejectBudget(budget.id, budget.title, budget.project_id)}
                        className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Reject</button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="px-4 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">New Budget Proposal</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Marketing Campaign Q2"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Link to Project</label>
                <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                  <option value="">No specific project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Amount *</label>
                  <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                    {['USD', 'EUR', 'RWF', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                    {['general', 'marketing', 'development', 'operations', 'hr', 'infrastructure', 'research'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                    {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Explain the budget request..."
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Impact Analysis</label>
                <textarea value={form.impact_analysis} onChange={e => setForm({ ...form, impact_analysis: e.target.value })}
                  rows={2} placeholder="What impact will this budget have?"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.title.trim() || !form.amount}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
