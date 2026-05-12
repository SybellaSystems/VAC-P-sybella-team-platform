'use client';

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';

type LeaveRequest = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  decided_at: string | null;
};

export default function LeavePage() {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100);

      if (!mounted) return;
      setItems((data as LeaveRequest[]) ?? []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <Helmet>
        <title>Leave Management | VAC-P</title>
      </Helmet>

      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Leave Management</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Time Off Ledger</h2>
          <p className="text-white/40 mt-4 max-w-2xl">Requests, approvals, and coverage visibility.</p>
        </header>

        {loading ? (
          <div className="text-white/30 text-sm">Syncing requests...</div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-white/30 text-sm">No leave requests found.</div>
            ) : (
              items.map((r) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-3xl p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-white font-black">{r.leave_type}</div>
                      <div className="text-white/40 text-sm mt-1">
                        {r.start_date} → {r.end_date}
                      </div>
                    </div>
                    <div className="text-white/30 text-xs uppercase font-black tracking-widest">{r.status}</div>
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

