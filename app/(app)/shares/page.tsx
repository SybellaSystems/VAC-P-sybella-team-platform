'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';

type Share = {
  id: string;
  company_name: string;
  share_class: string;
  total_units: number;
  issued_units: number;
  par_value: number;
};

type Ownership = {
  id: string;
  share_id: string;
  user_id: string | null;
  auth_user_id: string | null;
  units: number;
  share_value: number | null;
  market_cap: number | null;
  acquired_at: string;
};

export default function SharesPage() {
  useDocumentTitle('Shares & Ownership | VAC-P');
  const { profile } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [ownership, setOwnership] = useState<Ownership[]>([]);
  const [loading, setLoading] = useState(true);

  const currentAuthId = profile?.id ?? null;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const { data: s } = await supabase
        .from('shares')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: o } = await supabase
        .from('ownership_records')
        .select('*')
        .order('acquired_at', { ascending: false });

      if (!mounted) return;
      setShares((s as Share[]) ?? []);
      setOwnership((o as Ownership[]) ?? []);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const myUnits = useMemo(() => {
    if (!currentAuthId) return 0;
    const mine = ownership.filter((o) => o.auth_user_id === currentAuthId || o.user_id === currentAuthId);
    return mine.reduce((acc, x) => acc + (Number(x.units) || 0), 0);
  }, [ownership, currentAuthId]);

  return (
    <div className="bg-[#050505] min-h-screen pt-28 pb-20 px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-6">Shares & Ownership</h1>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">Company Equity Dossier</h2>
          <p className="text-white/40 mt-4 max-w-2xl">View share classes and ownership allocation.</p>
        </header>

        {loading ? (
          <div className="text-white/30 text-sm">Syncing ledger...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Share Classes</h3>
                <div className="text-white/50 text-sm">{shares.length} classes</div>
              </div>
              {shares.length === 0 ? (
                <div className="text-white/30 text-sm">No share classes visible.</div>
              ) : (
                <div className="space-y-4">
                  {shares.map((s) => (
                    <div key={s.id} className="p-4 rounded-2xl bg-black/20 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-black">{s.company_name}</div>
                          <div className="text-white/40 text-sm">Class: {s.share_class}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-black">{Number(s.issued_units).toLocaleString()} issued</div>
                          <div className="text-white/40 text-sm">{Number(s.total_units).toLocaleString()} total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Ownership Records</h3>
                <div className="text-white/50 text-sm">My units: {myUnits.toLocaleString()}</div>
              </div>

              {ownership.length === 0 ? (
                <div className="text-white/30 text-sm">No ownership allocations visible.</div>
              ) : (
                <div className="space-y-4">
                  {ownership.slice(0, 12).map((o) => (
                    <div key={o.id} className="p-4 rounded-2xl bg-black/20 border border-white/10">
                      <div className="text-white/40 text-sm">Share ID: {o.share_id}</div>
                      <div className="text-white font-black mt-2">{Number(o.units).toLocaleString()} units</div>
                      {o.market_cap != null && (
                        <div className="text-white/40 text-sm mt-1">Market cap: {Number(o.market_cap).toLocaleString()}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-white/20 text-xs mt-6">RLS: non-SUPERADMIN users will not see full allocations.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

