'use client';

import { useEffect, useState, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Megaphone, TrendingUp, DollarSign, Activity, Plus, Pencil, Trash2, Search, CircleAlert as AlertCircle, Calendar, Target } from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type Campaign = {
  id: string;
  name: string;
  description: string;
  campaign_type: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: number;
  spent: number;
  target_audience: string;
  channels: string[] | string | null;
  created_at: string;
};

type Profile = { id: string; full_name: string };
type Project = { id: string; name: string };

/* --------------------------- Constants ---------------------------- */

const CAMPAIGN_STATUSES = [
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled',
] as const;

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-slate-100 text-slate-700',
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const CAMPAIGN_TYPES = [
  'email',
  'social',
  'paid_ads',
  'content',
  'event',
  'webinar',
  'seo',
  'other',
];

/* ----------------------------- Page ------------------------------- */

export default function MarketingPage() {
  const { profile } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<Partial<Campaign>>({});
  const [channelsText, setChannelsText] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = ['admin', 'director', 'manager', 'marketing'].includes(
    profile?.role || ''
  );

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [camp, proj] = await Promise.all([
        supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('id,name').order('name').limit(100),
      ]);
      if (camp.error) throw camp.error;
      if (proj.error) throw proj.error;
      setCampaigns((camp.data as Campaign[]) || []);
      setProjects((proj.data as Project[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.campaign_type?.toLowerCase().includes(q) ||
        c.target_audience?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [campaigns, statusFilter, search]);

  function openNew() {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      campaign_type: 'email',
      status: 'planning',
      start_date: '',
      end_date: '',
      budget: 0,
      spent: 0,
      target_audience: '',
    });
    setChannelsText('');
    setDialog(true);
  }

  function openEdit(c: Campaign) {
    setEditing(c);
    setForm({ ...c });
    const ch = Array.isArray(c.channels)
      ? c.channels.join(', ')
      : c.channels || '';
    setChannelsText(ch);
    setDialog(true);
  }

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const channels = channelsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: form.name,
        description: form.description,
        campaign_type: form.campaign_type,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: Number(form.budget) || 0,
        spent: Number(form.spent) || 0,
        target_audience: form.target_audience,
        channels,
      };
      if (editing) {
        const { error } = await supabase
          .from('marketing_campaigns')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_campaigns').insert({
          ...payload,
          created_by: profile?.id,
        });
        if (error) throw error;
      }
      setDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this campaign?')) return;
    const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* ---------------------------- Stats ------------------------------ */

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  /* --------------------------- Render ------------------------------- */

  return (
    <div>
      <TopBar title="Marketing" subtitle="Campaigns and marketing operations" />
      <div className="p-4 sm:p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Campaigns</CardDescription>
              <CardTitle className="text-2xl">{totalCampaigns}</CardTitle>
            </CardHeader>
            <CardContent>
              <Megaphone className="h-4 w-4 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Campaigns</CardDescription>
              <CardTitle className="text-2xl">{activeCampaigns}</CardTitle>
            </CardHeader>
            <CardContent>
              <Activity className="h-4 w-4 text-emerald-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Budget</CardDescription>
              <CardTitle className="text-2xl">${(totalBudget / 1000).toFixed(1)}K</CardTitle>
            </CardHeader>
            <CardContent>
              <DollarSign className="h-4 w-4 text-amber-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Budget Utilization</CardDescription>
              <CardTitle className="text-2xl">{utilization}%</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="pl-9 w-52"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {CAMPAIGN_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {canManage && (
            <Button onClick={openNew}>
              <Plus size={16} className="mr-1.5" /> Add Campaign
            </Button>
          )}
        </div>

        {/* Campaign cards */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="h-5 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-500 mb-1">No campaigns found</p>
              <p className="text-xs text-slate-400">
                {canManage
                  ? 'Create your first campaign to get started.'
                  : 'Campaigns will appear here once created.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const budget = c.budget || 0;
              const spent = c.spent || 0;
              const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              const channels = Array.isArray(c.channels)
                ? c.channels
                : c.channels
                ? String(c.channels).split(',').map((s) => s.trim()).filter(Boolean)
                : [];
              return (
                <Card key={c.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{c.name}</CardTitle>
                        <CardDescription className="capitalize">{c.campaign_type}</CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'}>
                        {c.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {c.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    )}
                    {c.target_audience && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Target size={12} />
                        <span className="truncate">{c.target_audience}</span>
                      </div>
                    )}
                    {(c.start_date || c.end_date) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} />
                        <span>
                          {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'} →{' '}
                          {c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    )}
                    {channels.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {channels.map((ch, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Budget vs Spent</span>
                        <span className="font-semibold">
                          ${spent.toLocaleString()} / ${budget.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{pct}% utilized</p>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                          <Pencil size={13} className="mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => remove(c.id)}>
                          <Trash2 size={13} className="mr-1 text-red-500" /> Delete
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* --------------------- Campaign Dialog --------------------- */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Campaign' : 'Add Campaign'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update campaign details.' : 'Create a new marketing campaign.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.campaign_type || 'email'}
                  onValueChange={(v) => setForm({ ...form, campaign_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={form.status || 'planning'}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date ? form.start_date.slice(0, 10) : ''}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={form.end_date ? form.end_date.slice(0, 10) : ''}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Budget ($)</Label>
                <Input
                  type="number"
                  value={form.budget || 0}
                  onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Spent ($)</Label>
                <Input
                  type="number"
                  value={form.spent || 0}
                  onChange={(e) => setForm({ ...form, spent: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Target Audience</Label>
              <Input
                value={form.target_audience || ''}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                placeholder="e.g. Enterprise SaaS decision-makers"
              />
            </div>
            <div>
              <Label className="text-xs">Channels (comma-separated)</Label>
              <Input
                value={channelsText}
                onChange={(e) => setChannelsText(e.target.value)}
                placeholder="Email, LinkedIn, Google Ads"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
