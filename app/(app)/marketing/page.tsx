'use client';

import Link from 'next/link';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Megaphone, Building2, BarChart3, BookOpen } from 'lucide-react';

const marketingRoles = new Set(['marketing_manager', 'admin', 'director', 'sales']);

export default function MarketingPage() {
  useDocumentTitle('Marketing | VAC-P');
  const { profile } = useAuth();

  if (!profile?.role || !marketingRoles.has(profile.role)) {
    return (
      <div className="min-h-full">
        <TopBar title="Marketing" subtitle="Growth & positioning" />
        <div className="p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
          This hub is for marketing, sales, and leadership.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <TopBar title="Marketing hub" subtitle="Pipeline, narrative, and analytics" />
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect campaigns to accounts and evidence in the wiki. Sales sees the same customer spine for a single source of truth.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/sales-pipeline"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 flex gap-3 items-start"
          >
            <Megaphone className="text-fuchsia-600 shrink-0" size={22} />
            <div>
              <p className="font-semibold text-sm">Sales pipeline</p>
              <p className="text-xs text-muted-foreground mt-1">Stage prospects alongside sales</p>
            </div>
          </Link>
          <Link
            href="/customers"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 flex gap-3 items-start"
          >
            <Building2 className="text-primary shrink-0" size={22} />
            <div>
              <p className="font-semibold text-sm">Customers</p>
              <p className="text-xs text-muted-foreground mt-1">Accounts and contract context</p>
            </div>
          </Link>
          <Link
            href="/analytics"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 flex gap-3 items-start"
          >
            <BarChart3 className="text-primary shrink-0" size={22} />
            <div>
              <p className="font-semibold text-sm">Analytics</p>
              <p className="text-xs text-muted-foreground mt-1">Performance and adoption</p>
            </div>
          </Link>
          <Link
            href="/wiki"
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 flex gap-3 items-start"
          >
            <BookOpen className="text-primary shrink-0" size={22} />
            <div>
              <p className="font-semibold text-sm">Wiki</p>
              <p className="text-xs text-muted-foreground mt-1">Positioning, FAQs, launch notes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
