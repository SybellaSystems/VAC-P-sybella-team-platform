'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import type { Customer } from '@/lib/database.types';
import { TrendingUp } from 'lucide-react';

const pipelineRoles = new Set(['sales', 'admin', 'director', 'marketing_manager']);

export default function SalesPipelinePage() {
  useDocumentTitle('Sales pipeline | VAC-P');
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.role || !pipelineRoles.has(profile.role)) {
      setLoading(false);
      return;
    }
    void (async () => {
      const { data } = await supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(100);
      setCustomers((data as Customer[]) ?? []);
      setLoading(false);
    })();
  }, [profile?.role]);

  if (!profile?.role || !pipelineRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Sales pipeline" subtitle="Revenue opportunities" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          This pipeline is for sales, marketing, and leadership. Your workspace is in the sidebar.
        </div>
      </div>
    );
  }

  const byStatus = (s: Customer['status']) => customers.filter((c) => c.status === s);

  return (
    <div className="min-h-full">
      <TopBar title="Sales pipeline" subtitle="Customers by lifecycle stage" />
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <TrendingUp size={16} />
          Full customer directory
        </Link>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {(['prospect', 'active', 'inactive', 'churned'] as const).map((status) => (
              <section key={status} className="bg-white rounded-xl border border-border shadow-sm min-h-[200px]">
                <h2 className="text-xs font-semibold uppercase tracking-wide px-3 py-2 border-b border-border bg-muted/30 capitalize">
                  {status}
                </h2>
                <ul className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                  {byStatus(status).map((c) => (
                    <li key={c.id} className="rounded-lg border border-border px-2 py-2 text-sm">
                      <p className="font-medium leading-tight">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{c.company || c.country || '—'}</p>
                    </li>
                  ))}
                  {byStatus(status).length === 0 && <li className="text-xs text-muted-foreground px-2 py-4 text-center">Empty</li>}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
