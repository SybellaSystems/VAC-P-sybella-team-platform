'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { HrCandidate, HrPerformanceReview, HrOnboardingTask, Profile } from '@/lib/database.types';
import { logAudit } from '@/lib/audit';
import { UserPlus } from 'lucide-react';

const hrHubRoles = new Set(['hr', 'admin', 'director']);

export default function HrHubPage() {
  useDocumentTitle('HR hub | VAC-P');
  const { profile } = useAuth();
  const [tab, setTab] = useState<'candidates' | 'reviews' | 'onboarding'>('candidates');
  const [candidates, setCandidates] = useState<HrCandidate[]>([]);
  const [reviews, setReviews] = useState<HrPerformanceReview[]>([]);
  const [tasks, setTasks] = useState<HrOnboardingTask[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCand, setOpenCand] = useState(false);
  const [cForm, setCForm] = useState({ full_name: '', email: '', phone: '', role_applied: '', notes: '' });

  const canInsertCandidate = profile?.role && ['admin', 'hr'].includes(profile.role);
  const canManagePipeline = profile?.role && ['admin', 'director', 'hr', 'manager'].includes(profile.role);

  const load = async () => {
    if (!supabase) return;
    const [c, r, t, m] = await Promise.all([
      supabase.from('hr_candidates').select('*').order('created_at', { ascending: false }).limit(80),
      supabase.from('hr_performance_reviews').select('*').order('updated_at', { ascending: false }).limit(50),
      supabase.from('hr_onboarding_tasks').select('*').order('due_date', { ascending: true }).limit(80),
      supabase.from('profiles').select('*').order('full_name').limit(200),
    ]);

    setCandidates((c.data as HrCandidate[]) ?? []);
    setReviews((r.data as HrPerformanceReview[]) ?? []);
    setTasks((t.data as HrOnboardingTask[]) ?? []);
    setMembers((m.data as Profile[]) ?? []);
  };

  useEffect(() => {
    if (!profile?.role || !['hr', 'admin', 'director', 'manager'].includes(profile.role)) {
      setLoading(false);
      return;
    }
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [profile?.role]);

  const saveCandidate = async () => {
    if (!supabase) return;
    if (!profile?.id || !cForm.full_name.trim()) return;
    const { data } = await supabase

      .from('hr_candidates')
      .insert({
        full_name: cForm.full_name.trim(),
        email: cForm.email.trim(),
        phone: cForm.phone.trim(),
        role_applied: cForm.role_applied.trim(),
        notes: cForm.notes.trim(),
        created_by: profile.id,
        assigned_hr: profile.id,
      })
      .select('id')
      .maybeSingle();
    if (data?.id) await logAudit({ event_type: 'hr.candidate', entity_type: 'hr_candidate', entity_id: data.id, action: 'insert' });
    setOpenCand(false);
    setCForm({ full_name: '', email: '', phone: '', role_applied: '', notes: '' });
    await load();
  };

  const updateStage = async (id: string, stage: HrCandidate['stage']) => {
    if (!supabase) return;
    await supabase.from('hr_candidates').update({ stage, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };


  const toggleOnboarding = async (id: string, done: boolean) => {
    if (!supabase) return;
    await supabase.from('hr_onboarding_tasks').update({ is_done: done, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };


  const memberName = (id: string) => members.find((m) => m.id === id)?.full_name ?? id.slice(0, 8);

  if (!profile?.role || !['hr', 'admin', 'director', 'manager'].includes(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="HR hub" subtitle="People operations" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          HR tools are limited to HR, managers, and leadership. Use Team for directory access.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="HR hub" subtitle="Hiring, reviews, onboarding" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex flex-wrap gap-2 items-center">
          {(['candidates', 'reviews', 'onboarding'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-white border-border hover:bg-muted/50'
              }`}
            >
              {t === 'candidates' ? 'Candidates' : t === 'reviews' ? 'Reviews' : 'Onboarding'}
            </button>
          ))}
          {canInsertCandidate && tab === 'candidates' && (
            <Button size="sm" className="gap-1 ml-auto" onClick={() => setOpenCand(true)}>
              <UserPlus size={14} />
              Add candidate
            </Button>
          )}
          <Link href="/team" className="text-sm text-primary hover:underline ml-auto sm:ml-0">
            Team directory →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tab === 'candidates' ? (
          <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {candidates.length === 0 ? (
                <li className="p-8 text-sm text-muted-foreground text-center">
                  No candidates. Run the latest migration if tables are missing.
                </li>
              ) : (
                candidates.map((c) => (
                  <li key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                      <p className="text-xs mt-1">{c.role_applied || 'Role TBD'}</p>
                    </div>
                    {canManagePipeline && (
                      <select
                        className="text-xs border border-input rounded-md px-2 py-1.5 bg-white"
                        value={c.stage}
                        onChange={(e) => void updateStage(c.id, e.target.value as HrCandidate['stage'])}
                      >
                        {(['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : tab === 'reviews' ? (
          <section className="space-y-3">
            {hrHubRoles.has(profile.role) && (
              <p className="text-xs text-muted-foreground">
                Create reviews from admin tools or extend this hub; rows respect RLS (member, reviewer, HR).
              </p>
            )}
            <ul className="bg-white rounded-2xl border border-border divide-y divide-border">
              {reviews.length === 0 ? (
                <li className="p-8 text-sm text-muted-foreground text-center">No performance reviews yet.</li>
              ) : (
                reviews.map((r) => (
                  <li key={r.id} className="p-4 text-sm">
                    <p className="font-medium">{r.period_label || 'Review'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {memberName(r.member_id)} · {r.status}
                    </p>
                    {r.summary ? <p className="mt-2 text-muted-foreground">{r.summary}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <ul className="divide-y divide-border">
              {tasks.length === 0 ? (
                <li className="p-8 text-sm text-muted-foreground text-center">No onboarding tasks.</li>
              ) : (
                tasks.map((t) => (
                  <li key={t.id} className="p-4 flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={t.is_done}
                      onChange={(e) => void toggleOnboarding(t.id, e.target.checked)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        For {memberName(t.member_id)}
                        {t.due_date ? ` · due ${t.due_date}` : ''}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        )}
      </div>

      <Dialog open={openCand} onOpenChange={setOpenCand}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input placeholder="Full name" value={cForm.full_name} onChange={(e) => setCForm({ ...cForm, full_name: e.target.value })} />
            <Input placeholder="Email" value={cForm.email} onChange={(e) => setCForm({ ...cForm, email: e.target.value })} />
            <Input placeholder="Phone" value={cForm.phone} onChange={(e) => setCForm({ ...cForm, phone: e.target.value })} />
            <Input placeholder="Role applied for" value={cForm.role_applied} onChange={(e) => setCForm({ ...cForm, role_applied: e.target.value })} />
            <Textarea placeholder="Notes" value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenCand(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCandidate()} disabled={!cForm.full_name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
