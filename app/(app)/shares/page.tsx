'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { canManageShares } from '@/lib/rbac';
import type { Profile, ShareAllocation } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { logAudit } from '@/lib/audit';

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
  auth_user_id: string | null;
  units: number;
  share_value: number | null;
  market_cap: number | null;
};

export default function SharesPage() {
  useDocumentTitle('Shares | VAC-P');
  const { profile } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [ownership, setOwnership] = useState<Ownership[]>([]);
  const [allocations, setAllocations] = useState<ShareAllocation[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [shareForm, setShareForm] = useState({ company_name: 'Sybella Systems', share_class: 'COMMON', total_units: '1000000', issued_units: '0', par_value: '0' });
  const [allocForm, setAllocForm] = useState({
    share_id: '',
    allocation_type: 'internal' as 'internal' | 'external',
    profile_id: '',
    external_name: '',
    external_email: '',
    units: '',
    notes: '',
  });

  const isAdmin = canManageShares(profile?.role);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: o }, { data: mem }] = await Promise.all([
      supabase.from('shares').select('*').order('created_at', { ascending: false }),
      supabase.from('ownership_records').select('*').order('acquired_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
    ]);
    setShares((s as Share[]) ?? []);
    setOwnership((o as Ownership[]) ?? []);
    setMembers((mem as Profile[]) ?? []);

    const { data: alloc, error } = await supabase.from('share_allocations').select('*').order('created_at', { ascending: false });
    if (!error) setAllocations((alloc as ShareAllocation[]) ?? []);
    else setAllocations([]);

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const memberLabel = useMemo(() => {
    const m: Record<string, string> = {};
    members.forEach((p) => {
      m[p.id] = p.full_name || p.email;
    });
    return m;
  }, [members]);

  const saveShareClass = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('shares')
      .insert({
        company_name: shareForm.company_name.trim(),
        share_class: shareForm.share_class.trim(),
        total_units: Number(shareForm.total_units) || 0,
        issued_units: Number(shareForm.issued_units) || 0,
        par_value: Number(shareForm.par_value) || 0,
      })
      .select('id')
      .maybeSingle();
    if (data?.id) await logAudit({ event_type: 'shares.class_created', entity_type: 'share', entity_id: data.id, action: 'insert' });
    setShareModal(false);
    await load();
  };

  const saveAllocation = async () => {
    if (!profile || !allocForm.share_id) return;
    const row: Record<string, unknown> = {
      share_id: allocForm.share_id,
      allocation_type: allocForm.allocation_type,
      units: Number(allocForm.units) || 0,
      notes: allocForm.notes.trim(),
      allocated_by: profile.id,
    };
    if (allocForm.allocation_type === 'internal') {
      row.profile_id = allocForm.profile_id || null;
      row.external_party_name = null;
      row.external_party_email = null;
    } else {
      row.profile_id = null;
      row.external_party_name = allocForm.external_name.trim();
      row.external_party_email = allocForm.external_email.trim() || null;
    }
    const { data } = await supabase.from('share_allocations').insert(row).select('id').maybeSingle();
    if (data?.id) await logAudit({ event_type: 'shares.allocation', entity_type: 'share_allocation', entity_id: data.id, action: 'insert' });
    setAllocModal(false);
    await load();
  };

  return (
    <div className="min-h-full">
      <TopBar title="Shares & ownership" subtitle="Equity register (visibility per role)" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShareModal(true)}>New share class</Button>
            <Button variant="outline" onClick={() => setAllocModal(true)} disabled={shares.length === 0}>
              Allocate units
            </Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3">Share classes</h2>
              {shares.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes visible for your role.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {shares.map((s) => (
                    <li key={s.id} className="py-3 flex justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{s.company_name}</p>
                        <p className="text-xs text-muted-foreground">{s.share_class}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>Issued {Number(s.issued_units).toLocaleString()}</p>
                        <p className="text-muted-foreground">Total {Number(s.total_units).toLocaleString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3">Allocations</h2>
              {allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No allocation rows yet (run latest DB migration).</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {allocations.map((a) => (
                    <li key={a.id} className="rounded-lg border border-border px-3 py-2 flex flex-wrap justify-between gap-2">
                      <span>
                        {a.allocation_type === 'internal'
                          ? memberLabel[a.profile_id || ''] || 'Member'
                          : `${a.external_party_name}${a.external_party_email ? ` · ${a.external_party_email}` : ''}`}
                      </span>
                      <span className="font-mono text-xs">{Number(a.units).toLocaleString()} units</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-3">Legacy ownership records</h2>
              {ownership.length === 0 ? (
                <p className="text-sm text-muted-foreground">None visible.</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {ownership.slice(0, 20).map((o) => (
                    <li key={o.id} className="flex justify-between border-b border-border pb-2">
                      <span>{o.auth_user_id ? memberLabel[o.auth_user_id] || o.auth_user_id : '—'}</span>
                      <span>{Number(o.units).toLocaleString()} units</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <Dialog open={shareModal} onOpenChange={setShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New share class</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input value={shareForm.company_name} onChange={(e) => setShareForm({ ...shareForm, company_name: e.target.value })} placeholder="Company" />
            <Input value={shareForm.share_class} onChange={(e) => setShareForm({ ...shareForm, share_class: e.target.value })} placeholder="Class" />
            <Input value={shareForm.total_units} onChange={(e) => setShareForm({ ...shareForm, total_units: e.target.value })} placeholder="Total units" />
            <Input value={shareForm.issued_units} onChange={(e) => setShareForm({ ...shareForm, issued_units: e.target.value })} placeholder="Issued" />
            <Input value={shareForm.par_value} onChange={(e) => setShareForm({ ...shareForm, par_value: e.target.value })} placeholder="Par value" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShareModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveShareClass()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={allocModal} onOpenChange={setAllocModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate units</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              value={allocForm.share_id}
              onChange={(e) => setAllocForm({ ...allocForm, share_id: e.target.value })}
            >
              <option value="">Select share class</option>
              {shares.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} — {s.share_class}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-md border border-input px-3 py-2 text-sm"
              value={allocForm.allocation_type}
              onChange={(e) => setAllocForm({ ...allocForm, allocation_type: e.target.value as 'internal' | 'external' })}
            >
              <option value="internal">Team member (internal)</option>
              <option value="external">External party</option>
            </select>
            {allocForm.allocation_type === 'internal' ? (
              <select
                className="w-full rounded-md border border-input px-3 py-2 text-sm"
                value={allocForm.profile_id}
                onChange={(e) => setAllocForm({ ...allocForm, profile_id: e.target.value })}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <Input placeholder="External name" value={allocForm.external_name} onChange={(e) => setAllocForm({ ...allocForm, external_name: e.target.value })} />
                <Input placeholder="Email (optional)" value={allocForm.external_email} onChange={(e) => setAllocForm({ ...allocForm, external_email: e.target.value })} />
              </>
            )}
            <Input placeholder="Units" value={allocForm.units} onChange={(e) => setAllocForm({ ...allocForm, units: e.target.value })} />
            <Input placeholder="Notes" value={allocForm.notes} onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAllocModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveAllocation()}>Save allocation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
