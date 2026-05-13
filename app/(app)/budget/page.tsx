'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';

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
    if (!profile || !draftTitle.trim()) return;
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
    if (!profile) return;
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

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">
            Budget Proposals & Approval Workflows
          </h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Finance Pipeline</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Propose budgets, follow multi-step approvals, keep a decision trail.</p>
        </header>

        {profile && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-10">
            <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">New proposal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                className="bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
                />
                <select
                  value={draftCurrency}
                  onChange={(e) => setDraftCurrency(e.target.value)}
                  className="w-28 bg-black/30 border border-white/10 rounded-xl py-2 px-2 text-sm text-white"
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
              className="mt-3 w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
            />
            <button
              type="button"
              disabled={submitting || !draftTitle.trim()}
              onClick={() => void createDraft()}
              className="mt-4 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
            >
              {submitting ? 'Saving…' : 'Save draft'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-white/30 text-sm">Syncing budgets...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-3xl p-6">
              <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-5">Proposals</h3>
              {proposals.length === 0 ? (
                <div className="text-white/30 text-sm">No proposals found.</div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((p) => (
                    <div key={p.id} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={
                          'w-full text-left p-4 rounded-2xl bg-black/20 border ' +
                          (selectedId === p.id ? 'border-blue-500/40' : 'border-white/10 hover:border-white/20')
                        }
                      >
                        <div className="text-white font-black">{p.title}</div>
                        <div className="text-white/40 text-sm mt-1">
                          {p.amount} {p.currency}
                        </div>
                        <div className="text-white/30 text-xs uppercase font-black tracking-widest mt-2">{p.status}</div>
                      </button>
                      {p.status === 'DRAFT' && p.auth_user_id === profile?.id && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void submitForApproval(p.id)}
                          className="w-full text-[10px] font-black uppercase tracking-wider py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 disabled:opacity-40"
                        >
                          Submit for approval
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-start justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Approval Steps</h3>
                  <div className="text-white/40 text-sm mt-2">{selectedId ? 'Workflow decision timeline' : 'Select a proposal'}</div>
                </div>
                <div className="text-white/20 text-xs">Role-based reviewers</div>
              </div>

              {selectedId ? (
                selectedSteps.length === 0 ? (
                  <div className="text-white/30 text-sm">No workflow steps yet — submit a draft to generate the approval chain.</div>
                ) : (
                  <div className="space-y-4">
                    {selectedSteps.map((s) => (
                      <div key={s.id} className="p-4 rounded-2xl bg-black/20 border border-white/10">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-white font-black">{s.step_name}</div>
                            {s.required_role ? (
                              <div className="text-white/40 text-sm mt-1">Role hint: {s.required_role}</div>
                            ) : null}
                          </div>
                          <div className="text-white/30 text-xs uppercase font-black tracking-widest">{s.status}</div>
                        </div>
                        {s.decision_note ? <div className="text-white/60 text-sm mt-4">{s.decision_note}</div> : null}
                        {s.decided_at ? (
                          <div className="text-white/20 text-xs mt-3">Decided: {new Date(s.decided_at).toLocaleString()}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-white/30 text-sm">Choose a proposal to view its workflow.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
