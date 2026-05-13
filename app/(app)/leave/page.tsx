'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { logAudit } from '@/lib/audit';

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
  useDocumentTitle('Leave Management | VAC-P');
  const { profile } = useAuth();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    setItems((data as LeaveRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const canApprove = profile?.role && ['admin', 'director', 'hr'].includes(profile.role);

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

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Leave Management</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Time Off Ledger</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Requests, approvals, and coverage visibility.</p>
        </header>

        {profile && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-10">
            <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-4">New request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-white/40 text-xs block mb-1">Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
                >
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-white/40 text-xs block mb-1">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-white/40 text-xs block mb-1">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
                />
              </div>
              <button
                type="button"
                disabled={saving || !startDate || !endDate}
                onClick={() => void submitRequest()}
                className="py-2 px-4 rounded-xl bg-blue-600 text-white text-sm font-black uppercase tracking-wider disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Submit'}
              </button>
            </div>
            <div className="mt-3">
              <label className="text-white/40 text-xs block mb-1">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-white/30 text-sm">Syncing requests...</div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-white/30 text-sm">No leave requests found.</div>
            ) : (
              items.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-6 flex-wrap">
                    <div>
                      <div className="text-white font-black">{r.leave_type}</div>
                      <div className="text-white/40 text-sm mt-1">
                        {r.start_date} → {r.end_date}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-white/30 text-xs uppercase font-black tracking-widest">{r.status}</div>
                      {canApprove && r.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void setStatus(r, 'APPROVED')}
                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void setStatus(r, 'DECLINED')}
                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-white"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {r.reason ? <div className="text-white/60 text-sm mt-4">{r.reason}</div> : null}
                  {r.decided_at ? (
                    <div className="text-white/20 text-xs mt-4">
                      Decided at: {new Date(r.decided_at).toLocaleString()}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
