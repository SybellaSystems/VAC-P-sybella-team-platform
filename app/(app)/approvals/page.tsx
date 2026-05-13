'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { canApproveLeave } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Wallet, CalendarRange } from 'lucide-react';

type LeaveRow = {
  id: string;
  auth_user_id: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
};

type StepRow = {
  id: string;
  budget_proposal_id: string;
  step_name: string;
  step_order: number;
  required_role: string | null;
  reviewer_auth_user_id: string | null;
  status: string;
  budget_proposals?: { title: string; amount: number; currency: string } | null;
};

const hubRoles = new Set(['admin', 'director', 'hr', 'manager', 'finance']);

function canActOnStep(profileRole: string, profileId: string, row: StepRow): boolean {
  if (['admin', 'director', 'finance'].includes(profileRole)) return true;
  if (row.reviewer_auth_user_id && row.reviewer_auth_user_id === profileId) return true;
  if (row.required_role && row.required_role === profileRole) return true;
  return false;
}

export default function ApprovalsPage() {
  useDocumentTitle('Approvals | VAC-P');
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const showLeave = profile?.role && canApproveLeave(profile.role);
  const showBudget = profile?.role && ['admin', 'director', 'manager', 'finance'].includes(profile.role);

  useEffect(() => {
    if (!profile?.id || !profile.role || !hubRoles.has(profile.role)) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      let leaveRows: LeaveRow[] = [];
      let stepRows: StepRow[] = [];
      if (showLeave) {
        const { data } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('status', 'PENDING')
          .order('requested_at', { ascending: false })
          .limit(50);
        leaveRows = (data as LeaveRow[]) ?? [];
        setLeaves(leaveRows);
      } else {
        setLeaves([]);
      }
      if (showBudget) {
        const { data } = await supabase
          .from('approval_workflows')
          .select('*, budget_proposals(title, amount, currency)')
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })
          .limit(80);
        stepRows = (data as StepRow[]) ?? [];
        setSteps(stepRows);
      } else {
        setSteps([]);
      }

      const { data: profs } = await supabase.from('profiles').select('id, full_name');
      const map: Record<string, string> = {};
      (profs as { id: string; full_name: string }[] | null)?.forEach((p) => {
        map[p.id] = p.full_name;
      });
      setNames(map);
      setLoading(false);
    })();
  }, [profile?.id, profile?.role, showLeave, showBudget]);

  const actionableSteps = useMemo(() => {
    if (!profile) return [];
    return steps.filter((s) => canActOnStep(profile.role, profile.id, s));
  }, [steps, profile]);

  if (!profile?.role || !hubRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Approvals" subtitle="Cross-functional queue" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          Your role does not use this approvals hub. Use Leave or Budgets from the sidebar when you need to act.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Approvals" subtitle="Leave and budget steps that need attention" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {showLeave && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarRange size={18} />
                  Pending leave
                  <Link href="/leave" className="ml-auto text-xs font-normal text-primary hover:underline">
                    Open leave
                  </Link>
                </div>
                {leaves.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-white rounded-xl border border-border p-4">No pending leave requests.</p>
                ) : (
                  <ul className="space-y-2">
                    {leaves.map((l) => (
                      <li key={l.id} className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{l.auth_user_id ? names[l.auth_user_id] ?? 'Team member' : 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {l.leave_type} · {l.start_date} → {l.end_date}
                          </p>
                          {l.reason ? <p className="text-sm mt-2">{l.reason}</p> : null}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/leave">Review in Leave</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {showBudget && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet size={18} />
                  Budget workflow steps
                  <Link href="/budget" className="ml-auto text-xs font-normal text-primary hover:underline">
                    Open budgets
                  </Link>
                </div>
                {actionableSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-white rounded-xl border border-border p-4">
                    No pending steps assigned to your role right now.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {actionableSteps.map((s) => {
                      const bp = s.budget_proposals as { title: string; amount: number; currency: string } | null;
                      return (
                        <li key={s.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                          <p className="font-medium text-sm">{bp?.title ?? 'Budget proposal'}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Step {s.step_order}: {s.step_name}
                            {bp ? ` · ${bp.currency} ${Number(bp.amount).toLocaleString()}` : ''}
                          </p>
                          <Button asChild size="sm" className="mt-3" variant="outline">
                            <Link href="/budget">Open in Budgets</Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {!showLeave && !showBudget && (
              <p className="text-sm text-muted-foreground">Nothing to display for your permissions.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
