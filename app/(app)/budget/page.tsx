'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { TopBar } from '@/components/layout/TopBar';

type BudgetProposal = {
  id: string;
  project_id: string | null;
  auth_user_id?: string | null;
  title: string;
  description: string | null;
  currency: string;
  amount: number;
  status: string;
  submitted_at: string | null;
};

type ApprovalStep = {
  id: string;
  step_name: string;
  step_order: number;
  required_role: string | null;
  status: string;
  decision_note: string | null;
  decided_at: string | null;
};

const WORKFLOW_TEMPLATE: { step_order: number; step_name: string; required_role: string | null }[] = [
  { step_order: 1, step_name: 'Accountant', required_role: 'finance' },
  { step_order: 2, step_name: 'Finance manager', required_role: 'director' },
  { step_order: 3, step_name: 'CEO', required_role: 'director' },
  { step_order: 4, step_name: 'Managing Director', required_role: 'admin' },
];

export default function BudgetPage() {
  useDocumentTitle('Budget Proposals | VAC-P');
  const { profile } = useAuth();
  const [proposals, setProposals] = useState<BudgetProposal[]>([]);
  const [stepsByProposal, setStepsByProposal] = useState<Record<string, ApprovalStep[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftCurrency, setDraftCurrency] = useState('USD');
  const [draftDesc, setDraftDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from('budget_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) {
        setProposals((data ?? []) as BudgetProposal[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('approval_workflows')

        .select('*')
        .eq('budget_proposal_id', selectedId)
        .order('step_order', { ascending: true });
      if (!cancelled) {
        setStepsByProposal((prev) => ({
          ...prev,
          [selectedId]: (data ?? []) as ApprovalStep[],
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const createDraft = async () => {
    if (!profile || !draftTitle.trim() || !supabase) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('budget_proposals')
      .insert({
        auth_user_id: profile.id,
        title: draftTitle.trim(),
        description: draftDesc.trim() || null,
        currency: draftCurrency,
        amount: Number(draftAmount) || 0,
        status: 'DRAFT',
      })
      .select('id')
      .maybeSingle();
    if (!error && data?.id) {
      await logAudit({
        event_type: 'budget.draft_created',
        entity_type: 'budget_proposal',
        entity_id: data.id,
        action: 'insert',
      });
      setDraftTitle('');
      setDraftAmount('');
      setDraftDesc('');
      const { data: again } = await supabase
        .from('budget_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setProposals((again ?? []) as BudgetProposal[]);
    }
    setSubmitting(false);
  };

  const submitForApproval = async (proposalId: string) => {
    if (!profile || !supabase) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from('budget_proposals')
      .update({ status: 'SUBMITTED', submitted_at: now })
      .eq('id', proposalId);
    if (uErr) {
      setSubmitting(false);
      return;
    }

    const rows = WORKFLOW_TEMPLATE.map((s) => ({
      budget_proposal_id: proposalId,
      step_name: s.step_name,
      step_order: s.step_order,
      required_role: s.required_role,
      status: 'PENDING',
    }));

    await supabase.from('approval_workflows').insert(rows);

    await logAudit({
      event_type: 'budget.submitted',
      entity_type: 'budget_proposal',
      entity_id: proposalId,
      action: 'workflow_started',
    });

    const { data: proposalsAgain } = await supabase
      .from('budget_proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setProposals((proposalsAgain ?? []) as BudgetProposal[]);

    const { data: stepsRows } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('budget_proposal_id', proposalId)
      .order('step_order', { ascending: true });
    setStepsByProposal((prev) => ({
      ...prev,
      [proposalId]: (stepsRows ?? []) as ApprovalStep[],
    }));

    setSubmitting(false);
  };

  const selectedSteps = selectedId ? stepsByProposal[selectedId] ?? [] : [];

  const canActOnStep = (s: ApprovalStep) => {
    if (!profile) return false;
    if (s.status !== 'PENDING') return false;
    if (profile.role === 'admin') return true;
    if (s.required_role && profile.role === s.required_role) return true;
    return false;
  };

  const stepUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return selectedSteps.slice(0, idx).every((x) => x.status === 'APPROVED');
  };

  const decideStep = async (step: ApprovalStep, approved: boolean) => {
    if (!profile || !selectedId || !supabase) return;
    setSubmitting(true);
    await supabase
      .from('approval_workflows')
      .update({
        status: approved ? 'APPROVED' : 'REJECTED',
        decided_at: new Date().toISOString(),
        reviewer_auth_user_id: profile.id,
        decision_note: approved ? 'Approved' : 'Rejected',
      })
      .eq('id', step.id);
    if (!approved) {
      await supabase.from('budget_proposals').update({ status: 'REJECTED' }).eq('id', selectedId);
    }
    await logAudit({
      event_type: 'budget.workflow_step',
      entity_type: 'approval_workflow',
      entity_id: step.id,
      action: approved ? 'approve' : 'reject',
    });
    const { data: stepsRows } = await supabase
      .from('approval_workflows')
      .select('*')
      .eq('budget_proposal_id', selectedId)
      .order('step_order', { ascending: true });
    const list = (stepsRows ?? []) as ApprovalStep[];
    setStepsByProposal((prev) => ({ ...prev, [selectedId]: list }));
    if (approved && list.length > 0 && list.every((x) => x.status === 'APPROVED')) {
      await supabase.from('budget_proposals').update({ status: 'APPROVED', decided_at: new Date().toISOString() }).eq('id', selectedId);
    }
    const { data: proposalsAgain } = await supabase.from('budget_proposals').select('*').order('created_at', { ascending: false }).limit(50);
    setProposals((proposalsAgain ?? []) as BudgetProposal[]);
    setSubmitting(false);
  };

  return (
    <div className="min-h-full">
      <TopBar title="Budgets" subtitle="Proposals and multi-step approvals" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {profile && (
          <div className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New proposal</p>
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                className="rounded-lg border border-input px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
                />
                <select
                  value={draftCurrency}
                  onChange={(e) => setDraftCurrency(e.target.value)}
                  className="w-24 rounded-lg border border-input px-2 py-2 text-sm bg-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
            </div>
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm resize-none"
            />
            <button
              type="button"
              disabled={submitting || !draftTitle.trim()}
              onClick={() => void createDraft()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold">Proposals</h3>
              {proposals.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                proposals.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left rounded-xl border p-3 text-sm transition-colors ${
                        selectedId === p.id ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {p.amount} {p.currency}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-2">{p.status}</p>
                    </button>
                    {p.status === 'DRAFT' && p.auth_user_id === profile?.id && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void submitForApproval(p.id)}
                        className="w-full text-xs font-semibold py-2 rounded-lg border border-border hover:bg-muted/50 disabled:opacity-40"
                      >
                        Submit for approval
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-1">Approval steps</h3>
              <p className="text-xs text-muted-foreground mb-4">{selectedId ? 'Review chain for selected proposal' : 'Select a proposal'}</p>
              {selectedId ? (
                selectedSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workflow yet — submit this proposal.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedSteps.map((s, idx) => {
                      const unlocked = stepUnlocked(idx);
                      const can = canActOnStep(s) && unlocked;
                      return (
                        <li key={s.id} className="rounded-xl border border-border p-4 bg-slate-50/60">
                          <div className="flex flex-wrap justify-between gap-2">
                            <div>
                              <p className="font-medium">{s.step_name}</p>
                              {s.required_role ? (
                                <p className="text-xs text-muted-foreground mt-1">Reviewer role: {s.required_role}</p>
                              ) : null}
                              {!unlocked && s.status === 'PENDING' ? (
                                <p className="text-[10px] text-amber-700 mt-2">Waiting on earlier steps.</p>
                              ) : null}
                            </div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">{s.status}</span>
                          </div>
                          {s.decided_at ? (
                            <p className="text-[10px] text-muted-foreground mt-2">{new Date(s.decided_at).toLocaleString()}</p>
                          ) : null}
                          {can && (
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void decideStep(s, true)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void decideStep(s, false)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Pick a proposal from the list.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
