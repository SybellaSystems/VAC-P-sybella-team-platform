'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';
import { TopBar } from '@/components/layout/TopBar';
import { canApproveLeave } from '@/lib/rbac';
import type { Profile } from '@/lib/database.types';
import { ChevronRight } from 'lucide-react';

type LeaveRequest = {
  id: string;
  auth_user_id: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  decided_at: string | null;
};

export default function LeavePage() {
  useDocumentTitle('Leave | VAC-P');
  const { profile } = useAuth();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [leaveType, setLeaveType] = useState('VACATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(100);
    const list = (data as LeaveRequest[]) ?? [];
    setItems(list);
    const rawIds = list.map((x) => x.auth_user_id).filter((id): id is string => Boolean(id));
    const ids = Array.from(new Set(rawIds));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', ids);
      const map: Record<string, Profile> = {};
      (profs as Profile[] | null)?.forEach((p) => {
        map[p.id] = p;
      });
      setProfiles(map);
    } else setProfiles({});
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const canApprove = canApproveLeave(profile?.role);

  const submitRequest = async () => {
    if (!profile || !startDate || !endDate) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        auth_user_id: profile.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
        status: 'PENDING',
      })
      .select('id')
      .maybeSingle();
    if (!error && data?.id) {
      await logAudit({
        event_type: 'leave.requested',
        entity_type: 'leave_request',
        entity_id: data.id,
        action: 'insert',
        details: `${leaveType} ${startDate}–${endDate}`,
      });
      setReason('');
      setStep(1);
      await load();
    }
    setSaving(false);
  };

  const setStatus = async (row: LeaveRequest, status: string) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        decided_at: new Date().toISOString(),
        decided_by_auth_user_id: profile?.id ?? null,
      })
      .eq('id', row.id);
    if (!error) {
      await logAudit({
        event_type: 'leave.decided',
        entity_type: 'leave_request',
        entity_id: row.id,
        action: status,
      });
      await load();
    }
  };

  const requesterName = useMemo(
    () => (uid: string | null) => (uid ? profiles[uid]?.full_name || 'Team member' : '—'),
    [profiles]
  );

  return (
    <div className="min-h-full">
      <TopBar title="Leave" subtitle="Time off requests and approvals" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {profile && (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-slate-50/80">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New request</p>
              <div className="flex gap-2 mt-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-1 text-xs">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                        step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {n}
                    </span>
                    {n < 3 && <ChevronRight size={14} className="text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {step === 1 && (
                <>
                  <p className="text-sm text-muted-foreground">Select dates for your absence.</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Start</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">End</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!startDate || !endDate}
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
                  >
                    Continue
                  </button>
                </>
              )}
              {step === 2 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Leave type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-white"
                    >
                      <option value="VACATION">Vacation</option>
                      <option value="SICK">Sick</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border text-sm">
                      Back
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                      Review
                    </button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">You:</span>{' '}
                      <span className="font-semibold">{profile.full_name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Type:</span> {leaveType}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Dates:</span> {startDate} → {endDate}
                    </p>
                    {reason ? (
                      <p>
                        <span className="text-muted-foreground">Note:</span> {reason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg border text-sm">
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void submitRequest()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                    >
                      {saving ? 'Submitting…' : 'Submit request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">All requests</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((r) => (
                <li key={r.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{requesterName(r.auth_user_id)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.leave_type} · {r.start_date} → {r.end_date}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {r.status}
                    </span>
                  </div>
                  {r.reason ? <p className="text-sm text-foreground/80 mt-3 border-t border-border pt-3">{r.reason}</p> : null}
                  {canApprove && r.status === 'PENDING' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => void setStatus(r, 'APPROVED')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void setStatus(r, 'DECLINED')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {r.decided_at ? (
                    <p className="text-[10px] text-muted-foreground mt-3">Updated {new Date(r.decided_at).toLocaleString()}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
