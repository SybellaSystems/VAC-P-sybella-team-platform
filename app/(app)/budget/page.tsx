'use client';

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

type BudgetProposal = {
  id: string;
  project_id: string | null;
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

export default function BudgetPage() {
  const [proposals, setProposals] = useState<BudgetProposal[]>([]);
  const [stepsByProposal, setStepsByProposal] = useState<Record<string, ApprovalStep[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('budget_proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mounted) return;
      setProposals((data ?? []) as BudgetProposal[]);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSteps = async () => {
      if (!selectedId) return;
      const { data } = await supabase
        .from('approval_workflows')
        .select('*')
        .eq('budget_proposal_id', selectedId)
        .order('step_order', { ascending: true });

      if (!mounted) return;
      setStepsByProposal({
        ...stepsByProposal,
        [selectedId]: (data ?? []) as ApprovalStep[],
      });
    };


    loadSteps();
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const selectedSteps = selectedId ? stepsByProposal[selectedId] ?? [] : [];

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <Helmet>
        <title>Budget Proposals | VAC-P</title>
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">
            Budget Proposals & Approval Workflows
          </h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Finance Pipeline</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Propose budgets, follow multi-step approvals, keep a decision trail.</p>
        </header>

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
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={'w-full text-left p-4 rounded-2xl bg-black/20 border ' + (selectedId === p.id ? 'border-blue-500/40' : 'border-white/10 hover:border-white/20')}
                    >
                      <div className="text-white font-black">{p.title}</div>
                      <div className="text-white/40 text-sm mt-1">
                        {p.amount} {p.currency}
                      </div>
                      <div className="text-white/30 text-xs uppercase font-black tracking-widest mt-2">{p.status}</div>
                    </button>
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
                <div className="text-white/20 text-xs">RLS controls visibility</div>
              </div>

              {selectedId ? (
                selectedSteps.length === 0 ? (
                  <div className="text-white/30 text-sm">No workflow steps available.</div>
                ) : (
                  <div className="space-y-4">
                    {selectedSteps.map((s) => (
                      <div key={s.id} className="p-4 rounded-2xl bg-black/20 border border-white/10">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-white font-black">{s.step_name}</div>
                            {s.required_role ? <div className="text-white/40 text-sm mt-1">Role: {s.required_role}</div> : null}
                          </div>
                          <div className="text-white/30 text-xs uppercase font-black tracking-widest">{s.status}</div>
                        </div>
                        {s.decision_note ? <div className="text-white/60 text-sm mt-4">{s.decision_note}</div> : null}
                        {s.decided_at ? <div className="text-white/20 text-xs mt-3">Decided: {new Date(s.decided_at).toLocaleString()}</div> : null}
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

