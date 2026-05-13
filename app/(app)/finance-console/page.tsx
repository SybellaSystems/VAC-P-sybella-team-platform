'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import type { ProjectBudgetLink } from '@/lib/database.types';
import { logAudit } from '@/lib/audit';
import { Landmark, Link2 } from 'lucide-react';

const financeHubRoles = new Set(['finance', 'admin', 'director', 'manager']);

type LinkRow = ProjectBudgetLink & {
  projects?: { name: string } | null;
  budget_proposals?: { title: string; amount: number; currency: string } | null;
};

export default function FinanceConsolePage() {
  useDocumentTitle('Finance console | VAC-P');
  const { profile } = useAuth();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [budgets, setBudgets] = useState<{ id: string; title: string }[]>([]);
  const [projectId, setProjectId] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [loading, setLoading] = useState(true);

  const canMutate = profile?.role && ['finance', 'admin', 'director', 'manager'].includes(profile.role);

  const load = async () => {
    const { data } = await supabase
      .from('project_budget_links')
      .select('*, projects(name), budget_proposals(title, amount, currency)')
      .order('created_at', { ascending: false })
      .limit(80);
    setLinks((data as LinkRow[]) ?? []);
  };

  useEffect(() => {
    if (!profile?.role || !financeHubRoles.has(profile.role)) {
      setLoading(false);
      return;
    }
    void (async () => {
      await load();
      const [p, b] = await Promise.all([
        supabase.from('projects').select('id, name').order('name').limit(100),
        supabase.from('budget_proposals').select('id, title').order('created_at', { ascending: false }).limit(100),
      ]);
      setProjects((p.data as { id: string; name: string }[]) ?? []);
      setBudgets((b.data as { id: string; title: string }[]) ?? []);
      setLoading(false);
    })();
  }, [profile?.role]);

  const addLink = async () => {
    if (!profile?.id || !canMutate || !projectId || !budgetId) return;
    const { data } = await supabase
      .from('project_budget_links')
      .insert({
        project_id: projectId,
        budget_proposal_id: budgetId,
        link_role: 'allocation',
        created_by: profile.id,
      })
      .select('id')
      .maybeSingle();
    if (data?.id) {
      await logAudit({
        event_type: 'finance.project_budget_link',
        entity_type: 'project_budget_link',
        entity_id: data.id,
        action: 'insert',
        details: `${projectId}↔${budgetId}`,
      });
    }
    setBudgetId('');
    await load();
  };

  if (!profile?.role || !financeHubRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Finance console" subtitle="Projects ↔ budgets" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          This console is for finance, managers, and leadership. Open Finance for general records.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Finance console" subtitle="Link capital plans to delivery" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/finance" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
            <Landmark size={16} />
            Finance records
          </Link>
          <Link href="/budget" className="font-medium text-primary hover:underline">
            Budget approvals →
          </Link>
        </div>

        {canMutate && (
          <section className="bg-white rounded-2xl border border-border p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Link2 size={18} />
              New project ↔ budget link
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="rounded-md border border-input px-3 py-2 text-sm bg-white"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-input px-3 py-2 text-sm bg-white"
                value={budgetId}
                onChange={(e) => setBudgetId(e.target.value)}
              >
                <option value="">Select budget proposal</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => void addLink()} disabled={!projectId || !budgetId}>
              Create link
            </Button>
          </section>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <h2 className="text-sm font-semibold px-4 py-3 border-b border-border bg-muted/30">Registered links</h2>
            <ul className="divide-y divide-border">
              {links.length === 0 ? (
                <li className="px-4 py-8 text-sm text-muted-foreground text-center">No links yet. Add one above or run DB migrations.</li>
              ) : (
                links.map((row) => {
                  const pr = row.projects;
                  const bp = row.budget_proposals;
                  return (
                    <li key={row.id} className="px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{pr?.name ?? 'Project'}</span>
                      <span className="text-muted-foreground">
                        {bp?.title ?? 'Budget'}
                        {bp?.amount != null ? ` · ${bp.currency ?? ''} ${Number(bp.amount).toLocaleString()}` : ''}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
