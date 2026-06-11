'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { queueOfflineAction } from '@/lib/offline';
import { TopBar } from '@/components/layout/TopBar';
import { PersistentCollapsible } from '@/components/ui/PersistentCollapsible';
import { Plus, CalendarDays, ImageIcon, Sparkles, ListChecks } from 'lucide-react';
import type { ContentCalendarItem, MarketingAsset, MarketingCampaign } from '@/lib/database.types';

const defaultForm = {
  name: '',
  description: '',
  status: 'planning',
  start_date: '',
  end_date: '',
  budget: '0',
  leads_target: '0',
};

function formatDate(date?: string | null) {
  return date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date)) : 'TBD';
}

export default function MarketingCampaignsPage() {
  useDocumentTitle('Campaign workspace | VAC-P');
  const { profile } = useAuth();
  const { queue, syncing, lastSyncedAt, attemptSync } = useOfflineSync();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [calendarItems, setCalendarItems] = useState<ContentCalendarItem[]>([]);
  const [assets, setAssets] = useState<MarketingAsset[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pendingMessages = useMemo(() => queue.length, [queue.length]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [campaignRes, calendarRes, assetRes] = await Promise.all([
        supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('content_calendar_items').select('*').order('scheduled_date', { ascending: true }).limit(50),
        supabase.from('marketing_assets').select('*').order('created_at', { ascending: false }).limit(20),
      ]);

      setCampaigns((campaignRes.data as MarketingCampaign[]) ?? []);
      setCalendarItems((calendarRes.data as ContentCalendarItem[]) ?? []);
      setAssets((assetRes.data as MarketingAsset[]) ?? []);
      setLoading(false);
    };

    void load();
  }, []);

  const handleFieldChange = (key: keyof typeof defaultForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createCampaign = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Campaign name is required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      owner_id: profile?.id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: Number(form.budget) || 0,
      leads_target: Number(form.leads_target) || 0,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineAction({ type: 'createCampaign', payload });
      setForm(defaultForm);
      return;
    }

    const response = await supabase.from('marketing_campaigns').insert([payload]).select().single();
    if (response.error) {
      queueOfflineAction({ type: 'createCampaign', payload });
      setForm(defaultForm);
      setFormError('Saved locally and will sync when back online.');
      return;
    }

    setForm(defaultForm);
    const created = response.data as MarketingCampaign | null;
    if (created) {
      setCampaigns((current) => [{ ...created, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...current]);
    }
  };

  const addCalendarItem = async () => {
    if (!campaigns.length) return;
    const itemPayload: Omit<ContentCalendarItem, 'id' | 'created_at' | 'updated_at'> = {
      campaign_id: campaigns[0].id,
      title: `Social update for ${campaigns[0].name}`,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      content_type: 'social',
      owner_id: profile?.id || null,
      notes: 'Planned from campaign workspace.',
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineAction({ type: 'createCalendarItem', payload: itemPayload });
      return;
    }

    const response = await supabase.from('content_calendar_items').insert([itemPayload]).select().single();
    if (response.error) {
      queueOfflineAction({ type: 'createCalendarItem', payload: itemPayload });
      return;
    }

    const createdItem = response.data as ContentCalendarItem | null;
    if (createdItem) {
      setCalendarItems((current) => [{ ...createdItem, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...current]);
    }
  };

  return (
    <div className="min-h-full">
      <TopBar title="Campaign workspace" subtitle="Marketing creation, calendar, and asset tracking" />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use this workspace to manage campaign plans, publish calendar items, and keep marketing assets aligned with launch execution.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Campaigns</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{campaigns.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Calendar entries</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{calendarItems.length}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Assets</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{assets.length}</p>
              </div>
            </div>
          </section>
          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Offline sync</p>
                  <p className="text-xs text-muted-foreground">{syncing ? 'Syncing queued changes…' : lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : 'No recent sync'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void attemptSync()}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  Sync now
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Pending queue: {pendingMessages}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={18} />
                <span>Quick actions</span>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={addCalendarItem}
                  className="rounded-2xl border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Add planned calendar item
                </button>
              </div>
            </div>
          </aside>
        </div>

        <PersistentCollapsible title="Create campaign" prefKey="campaignWorkspaceCreate" open onToggle={() => undefined}>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <div className="grid gap-3">
                <label className="space-y-2 text-sm">
                  <span>Campaign name</span>
                  <input
                    value={form.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    placeholder="New product launch"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>Description</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => handleFieldChange('description', event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Status</span>
                    <select
                      value={form.status}
                      onChange={(event) => handleFieldChange('status', event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Owner</span>
                    <input
                      value={profile?.email ?? 'unassigned'}
                      disabled
                      className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm text-muted-foreground"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Start date</span>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(event) => handleFieldChange('start_date', event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>End date</span>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(event) => handleFieldChange('end_date', event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span>Budget</span>
                    <input
                      type="number"
                      min="0"
                      value={form.budget}
                      onChange={(event) => handleFieldChange('budget', event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span>Lead goal</span>
                    <input
                      type="number"
                      min="0"
                      value={form.leads_target}
                      onChange={(event) => handleFieldChange('leads_target', event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
                <button
                  type="button"
                  onClick={createCampaign}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  <Plus size={16} />
                  Create campaign
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays size={18} />
                  <span>Calendar overview</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Aligned content items by campaign schedule for the next 30 days.</p>
              </div>
              <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon size={18} />
                  <span>Assets</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Manage campaign collateral and upload notes in one place.</p>
              </div>
            </div>
          </div>
        </PersistentCollapsible>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-semibold">Campaign list</h2>
                <p className="text-xs text-muted-foreground">Track campaigns across planning, execution, and performance.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-600">{loading ? 'Loading' : 'Ready'}</span>
            </div>
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{campaign.description || 'No campaign summary yet'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{campaign.status}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <span>Start: {formatDate(campaign.start_date)}</span>
                    <span>End: {formatDate(campaign.end_date)}</span>
                    <span>Budget: ${campaign.budget}</span>
                    <span>Leads: {campaign.leads_target}</span>
                  </div>
                </div>
              ))}
              {!campaigns.length && <p className="text-sm text-muted-foreground">No campaigns yet. Create your first campaign above.</p>}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks size={18} />
                <span>Upcoming content</span>
              </div>
              <div className="mt-4 space-y-3">
                {calendarItems.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border p-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.scheduled_date)} · {item.content_type}</p>
                  </div>
                ))}
                {!calendarItems.length && <p className="text-sm text-muted-foreground">No calendar items scheduled yet.</p>}
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ImageIcon size={18} />
                <span>Recent assets</span>
              </div>
              <div className="mt-4 grid gap-3">
                {assets.slice(0, 4).map((asset) => (
                  <div key={asset.id} className="rounded-2xl border border-border p-3">
                    <p className="font-medium">{asset.title}</p>
                    <p className="text-xs text-muted-foreground">{asset.file_type} · {asset.file_size} bytes</p>
                  </div>
                ))}
                {!assets.length && <p className="text-sm text-muted-foreground">No assets uploaded yet.</p>}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
