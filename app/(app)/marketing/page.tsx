'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useAuth } from '@/contexts/AuthContext';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { PersistentCollapsible } from '@/components/ui/PersistentCollapsible';
import { TopBar } from '@/components/layout/TopBar';
import { Megaphone, Building2, BarChart3, BookOpen } from 'lucide-react';

const marketingRoles = new Set(['marketing_manager', 'admin', 'director', 'sales']);

export default function MarketingPage() {
  useDocumentTitle('Marketing | VAC-P');
  const { profile } = useAuth();
  const { prefs, setPref } = useUiPreferences();
  const [marketingReports, setMarketingReports] = useState<any[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({ prospect: 0, active: 0, inactive: 0, churned: 0 });
  const [loading, setLoading] = useState(true);

  const campaignOpen = prefs.collapsedSections?.marketingCampaigns !== true;
  const analyticsOpen = prefs.collapsedSections?.marketingAnalytics !== true;
  const momentumOpen = prefs.collapsedSections?.marketingMomentum !== true;

  useEffect(() => {
    if (!profile?.role || !marketingRoles.has(profile.role)) {
      setLoading(false);
      return;
    }

    void (async () => {
      const [{ data: reports }, { data: customers }] = await Promise.all([
        supabase.from('accountability_reports').select('report_data').in('report_role', ['marketing_manager', 'sales']).limit(100),
        supabase.from('customers').select('status'),
      ]);

      setMarketingReports((reports as any[]) || []);
      setCustomerCounts(
        ((customers as any[]) || []).reduce(
          (acc, customer) => {
            const status = customer.status || 'inactive';
            if (acc[status] !== undefined) {
              acc[status] += 1;
            }
            return acc;
          },
          { prospect: 0, active: 0, inactive: 0, churned: 0 },
        ),
      );
      setLoading(false);
    })();
  }, [profile?.role]);

  const marketingMetrics = useMemo(() => {
    const rows = marketingReports || [];
    const sum = (key: string) => rows.reduce((total, row) => total + Number(row.report_data?.[key] ?? 0), 0);
    const numericValues = rows
      .map((row) => Number(row.report_data?.engagement_growth ?? NaN))
      .filter((value) => !Number.isNaN(value));

    return {
      campaignsLaunched: sum('campaigns_launched'),
      leadsGenerated: sum('leads_generated'),
      socialPosts: sum('social_posts'),
      engagementGrowth: numericValues.length ? Math.round(numericValues.reduce((acc, value) => acc + value, 0) / numericValues.length) : 0,
      recentReports: rows.length,
    };
  }, [marketingReports]);

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

        <PersistentCollapsible
          prefKey="marketingMomentum"
          title="Marketing momentum"
          open={momentumOpen}
          onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, marketingMomentum: !next })}
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading marketing metrics…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Campaigns launched</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{marketingMetrics.campaignsLaunched}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Leads generated</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{marketingMetrics.leadsGenerated}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Social posts</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{marketingMetrics.socialPosts}</p>
                </div>
                <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Engagement growth</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{marketingMetrics.engagementGrowth}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {Object.entries(customerCounts).map(([status, count]) => (
                  <div key={status} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{status}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{count}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </PersistentCollapsible>

        <PersistentCollapsible
          prefKey="marketingCampaigns"
          title="Campaign planning"
          open={campaignOpen}
          onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, marketingCampaigns: !next })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              href="/marketing/campaigns"
              className="bg-white rounded-xl border border-border p-4 shadow-sm hover:border-primary/40 flex gap-3 items-start"
            >
              <BarChart3 className="text-emerald-600 shrink-0" size={22} />
              <div>
                <p className="font-semibold text-sm">Campaign workspace</p>
                <p className="text-xs text-muted-foreground mt-1">Create, schedule, and track campaign assets</p>
              </div>
            </Link>
          </div>
        </PersistentCollapsible>

        <PersistentCollapsible
          prefKey="marketingAnalytics"
          title="Analytics & storytelling"
          open={analyticsOpen}
          onToggle={(next) => setPref('collapsedSections', { ...prefs.collapsedSections, marketingAnalytics: !next })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </PersistentCollapsible>
      </div>
    </div>
  );
}
