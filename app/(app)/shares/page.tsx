'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  Plus,
  Building2,
  Coins,
  ShieldAlert,
  History,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import { canManageShares } from '@/lib/rbac';
import type { Profile } from '@/lib/database.types';

// Types reflecting expanded database architecture
type ShareClassPool = {
  id: string;
  company_name: string;
  share_class: string;
  authorized_units: number;
  issued_units: number;
  reserved_units: number;
  cancelled_units: number;
  currency: string;
};

type ShareVesting = {
  id: string;
  allocation_id: string;
  start_date: string;
  vesting_months: number;
  cliff_months: number;
  vested_quantity: number;
  status: string;
};

type ShareAllocation = {
  id: string;
  share_id: string;
  profile_id: string;
  holder_type: 'founder' | 'employee' | 'investor' | 'advisor' | 'partner' | 'external';
  allocation_reason: string;
  quantity: number;
  granted_quantity: number;
  vested_quantity: number;
  cancelled_quantity: number;
  allocated_at: string;
  status: 'active' | 'paused' | 'terminated' | 'transferred' | 'cancelled';
  notes: string;
  currency: string;
  profile?: Profile;
  share_pool?: ShareClassPool;
  share_vesting?: ShareVesting[];
};

type CompanyValuation = {
  id: string;
  company_name: string;
  valuation_method: string;
  valuation_amount: number;
  currency: string;
  valuation_date: string;
  notes: string;
};

type ShareEvent = {
  id: string;
  allocation_id: string;
  event_type: string;
  quantity: number;
  event_date: string;
  reason: string;
  approved_by?: string;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function SharesPage() {
  const { profile } = useAuth();

  // State
  const [pools, setPools] = useState<ShareClassPool[]>([]);
  const [allocations, setAllocations] = useState<ShareAllocation[]>([]);
  const [valuations, setValuations] = useState<CompanyValuation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<ShareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog Controls
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isValuationOpen, setIsValuationOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);

  // Active items for actions
  const [selectedAllocation, setSelectedAllocation] = useState<ShareAllocation | null>(null);

  // Form States
  const [allocateForm, setAllocateForm] = useState({
    profile_id: '',
    share_id: '',
    holder_type: 'employee',
    quantity: 0,
    allocation_reason: '',
    enable_vesting: true,
    vesting_months: 48,
    cliff_months: 12,
  });

  const [valuationForm, setValuationForm] = useState({
    valuation_method: 'Revenue Multiple',
    valuation_amount: 0,
    notes: '',
  });

  const [terminateForm, setTerminateForm] = useState({
    reason: 'Employment ended',
    returned_to_pool: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Share Class Pools
      const { data: poolData, error: poolErr } = await supabase
        .from('shares')
        .select('*');
      if (poolErr) throw poolErr;

      // 2. Fetch Share Allocations with profiles & vesting schedules
      const { data: allocData, error: allocErr } = await supabase
        .from('share_allocations')
        .select('*, profile:profiles(*), share_pool:shares(*), share_vesting(*)')
        .order('quantity', { ascending: false });
      if (allocErr) throw allocErr;

      // 3. Fetch Company Valuations
      const { data: valData, error: valErr } = await supabase
        .from('company_valuations')
        .select('*')
        .order('valuation_date', { ascending: false });
      if (valErr) throw valErr;

      // 4. Fetch Profiles for Allocation Dropdown
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*');
      if (profErr) throw profErr;

      // 5. Fetch Events
      const { data: eventData, error: eventErr } = await supabase
        .from('share_events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(20);
      if (eventErr) throw eventErr;

      setPools((poolData as ShareClassPool[]) || []);
      setAllocations((allocData as ShareAllocation[]) || []);
      setValuations((valData as CompanyValuation[]) || []);
      setProfiles((profData as Profile[]) || []);
      setEvents((eventData as ShareEvent[]) || []);
    } catch (error) {
      console.error('Error fetching share data:', error);
      toast.error('Failed to load equity and share data');
    } finally {
      setLoading(false);
    }
  }

  // Calculated Metrics
  const latestValuation = valuations[0]?.valuation_amount || 0;

  const totalAuthorized = useMemo(
    () => pools.reduce((acc, p) => acc + Number(p.authorized_units || 0), 0),
    [pools]
  );

  const totalIssued = useMemo(
    () => allocations.reduce((acc, a) => acc + (a.status === 'active' ? Number(a.quantity || 0) : 0), 0),
    [allocations]
  );

  const pricePerShare = totalIssued > 0 ? latestValuation / totalIssued : 0;

  const canEdit = canManageShares(profile?.role);

  // Form Handlers

  // 1. Grant/Allocate Shares
  async function handleAllocateShares(e: React.FormEvent) {
    e.preventDefault();
    if (!allocateForm.profile_id || !allocateForm.share_id || allocateForm.quantity <= 0) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      // Insert allocation
      const { data: alloc, error: allocErr } = await supabase
        .from('share_allocations')
        .insert([
          {
            share_id: allocateForm.share_id,
            profile_id: allocateForm.profile_id,
            holder_type: allocateForm.holder_type,
            allocation_reason: allocateForm.allocation_reason,
            quantity: allocateForm.quantity,
            granted_quantity: allocateForm.quantity,
            vested_quantity: allocateForm.enable_vesting ? 0 : allocateForm.quantity,
            status: 'active',
            currency: 'RWF',
          },
        ])
        .select()
        .single();

      if (allocErr) throw allocErr;

      // If vesting enabled, create vesting record
      if (allocateForm.enable_vesting && alloc) {
        const { error: vestErr } = await supabase.from('share_vesting').insert([
          {
            allocation_id: alloc.id,
            start_date: new Date().toISOString().split('T')[0],
            vesting_months: allocateForm.vesting_months,
            cliff_months: allocateForm.cliff_months,
            vested_quantity: 0,
            status: 'active',
          },
        ]);
        if (vestErr) throw vestErr;
      }

      // Record share event
      await supabase.from('share_events').insert([
        {
          allocation_id: alloc.id,
          event_type: 'allocation',
          quantity: allocateForm.quantity,
          reason: allocateForm.allocation_reason || 'Initial Grant',
          approved_by: profile?.id,
        },
      ]);

      // Update pool issued_units
      const pool = pools.find((p) => p.id === allocateForm.share_id);
      if (pool) {
        await supabase
          .from('shares')
          .update({ issued_units: Number(pool.issued_units) + Number(allocateForm.quantity) })
          .eq('id', pool.id);
      }

      toast.success('Shares successfully allocated!');
      setIsAllocateOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to allocate shares');
    }
  }

  // 2. Add Company Valuation
  async function handleAddValuation(e: React.FormEvent) {
    e.preventDefault();
    if (valuationForm.valuation_amount <= 0) {
      toast.error('Valuation amount must be greater than zero');
      return;
    }

    try {
      const { error } = await supabase.from('company_valuations').insert([
        {
          company_name: 'Sybella Systems',
          valuation_method: valuationForm.valuation_method,
          valuation_amount: valuationForm.valuation_amount,
          currency: 'RWF',
          notes: valuationForm.notes,
          created_by: profile?.id,
        },
      ]);

      if (error) throw error;

      toast.success('Company valuation recorded successfully!');
      setIsValuationOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record valuation');
    }
  }

  // 3. Terminate/Cancel Allocation (Handle Departure)
  async function handleTerminateAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      const vested = Number(selectedAllocation.vested_quantity || 0);
      const granted = Number(selectedAllocation.granted_quantity || selectedAllocation.quantity);
      const unvested = Math.max(0, granted - vested);

      // Update share_allocation status and final quantity
      const { error: allocErr } = await supabase
        .from('share_allocations')
        .update({
          status: 'terminated',
          quantity: vested, // retain only vested
          cancelled_quantity: unvested,
          returned_to_pool: terminateForm.returned_to_pool ? unvested : 0,
        })
        .eq('id', selectedAllocation.id);

      if (allocErr) throw allocErr;

      // Update vesting status
      await supabase
        .from('share_vesting')
        .update({ status: 'terminated' })
        .eq('allocation_id', selectedAllocation.id);

      // Log event
      await supabase.from('share_events').insert([
        {
          allocation_id: selectedAllocation.id,
          event_type: 'termination',
          quantity: unvested,
          reason: terminateForm.reason,
          approved_by: profile?.id,
        },
      ]);

      // Return unvested shares to pool
      if (terminateForm.returned_to_pool && selectedAllocation.share_id) {
        const pool = pools.find((p) => p.id === selectedAllocation.share_id);
        if (pool) {
          await supabase
            .from('shares')
            .update({
              issued_units: Math.max(0, Number(pool.issued_units) - unvested),
              cancelled_units: Number(pool.cancelled_units || 0) + unvested,
            })
            .eq('id', pool.id);
        }
      }

      toast.success('Allocation updated and unvested shares reclaimed!');
      setIsTerminateOpen(false);
      setSelectedAllocation(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to process termination');
    }
  }

  if (loading) {
    return (
      <div>
        <TopBar title="Company Shares & Equity" subtitle="Loading cap table..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Company Shares" subtitle="Sybella Systems Equity, Cap Table & Vesting" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Equity & Ownership</h1>
            <p className="text-sm text-slate-500">
              Cap table management, vesting schedules, and valuation tracking (RWF)
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsValuationOpen(true)}>
                <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                Update Valuation
              </Button>
              <Button onClick={() => setIsAllocateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Grant / Allocate Shares
              </Button>
            </div>
          )}
        </div>

        {/* Top Key Performance Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Company Valuation</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {latestValuation.toLocaleString()} RWF
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Method: {valuations[0]?.valuation_method || 'N/A'}</span>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Share Price</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })} RWF
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Valuation ÷ Issued Shares</span>
              <Coins className="h-4 w-4 text-amber-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Issued Shares</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {totalIssued.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Of {totalAuthorized.toLocaleString()} Authorized</span>
              <PieChartIcon className="h-4 w-4 text-blue-600" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Equity Holders</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {allocations.filter((a) => a.status === 'active').length}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Founders, ESOP, Investors</span>
              <Users className="h-4 w-4 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Views */}
        <Tabs defaultValue="shareholders" className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="shareholders">Cap Table / Shareholders</TabsTrigger>
            <TabsTrigger value="pools">Share Pools & Classes</TabsTrigger>
            <TabsTrigger value="valuations">Valuation History</TabsTrigger>
            <TabsTrigger value="events">Audit & Events</TabsTrigger>
          </TabsList>

          {/* TAB 1: SHAREHOLDERS / CAP TABLE */}
          <TabsContent value="shareholders">
            <Card>
              <CardHeader>
                <CardTitle>Cap Table Allocations</CardTitle>
                <CardDescription>
                  Detailed distribution of individual equity grants, vesting state, and current RWF holdings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <PieChartIcon className="h-12 w-12 mb-3 stroke-1" />
                    <p>No equity grants recorded yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {allocations.map((alloc, idx) => {
                      const percentage = totalIssued > 0 ? (alloc.quantity / totalIssued) * 100 : 0;
                      const currentValueRWF = alloc.quantity * pricePerShare;
                      const isTerminated = alloc.status === 'terminated';

                      return (
                        <div
                          key={alloc.id}
                          className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isTerminated ? 'opacity-60 bg-slate-50/50 p-3 rounded' : ''
                          }`}
                        >
                          {/* Holder Info */}
                          <div className="flex items-start gap-3">
                            <div
                              className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {alloc.profile?.full_name || 'Unknown Member'}
                                </span>
                                <Badge variant="secondary" className="capitalize text-xs">
                                  {alloc.holder_type}
                                </Badge>
                                <Badge
                                  variant={isTerminated ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {alloc.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Granted on {new Date(alloc.allocated_at).toLocaleDateString()} • Reason:{' '}
                                {alloc.allocation_reason || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Equity Details */}
                          <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                            <div>
                              <div className="text-sm font-bold text-slate-900">
                                {Number(alloc.quantity).toLocaleString()} shares
                              </div>
                              <div className="text-xs text-slate-500">{percentage.toFixed(2)}% ownership</div>
                            </div>

                            <div>
                              <div className="text-sm font-semibold text-slate-800">
                                {Number(alloc.vested_quantity || alloc.quantity).toLocaleString()} vested
                              </div>
                              <div className="text-xs text-emerald-600 font-medium">
                                ~{Math.round(currentValueRWF).toLocaleString()} RWF
                              </div>
                            </div>

                            {canEdit && !isTerminated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  setSelectedAllocation(alloc);
                                  setIsTerminateOpen(true);
                                }}
                              >
                                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                End / Reclaim
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: SHARE POOLS & CLASSES */}
          <TabsContent value="pools">
            <div className="grid gap-4 md:grid-cols-2">
              {pools.map((pool) => {
                const avail =
                  Number(pool.authorized_units) -
                  Number(pool.issued_units) -
                  Number(pool.reserved_units) +
                  Number(pool.cancelled_units || 0);

                return (
                  <Card key={pool.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pool.company_name}</CardTitle>
                        <Badge>{pool.share_class.toUpperCase()}</Badge>
                      </div>
                      <CardDescription>Share Pool Overview</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Authorized</span>
                          <span className="font-bold text-slate-800">
                            {Number(pool.authorized_units).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Issued</span>
                          <span className="font-bold text-blue-600">
                            {Number(pool.issued_units).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Reserved (ESOP)</span>
                          <span className="font-bold text-purple-600">
                            {Number(pool.reserved_units).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Available Pool</span>
                          <span className="font-bold text-emerald-600">
                            {Math.max(0, avail).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: VALUATION HISTORY */}
          <TabsContent value="valuations">
            <Card>
              <CardHeader>
                <CardTitle>Historical Company Valuations</CardTitle>
                <CardDescription>Valuation trajectory used to compute share prices in RWF.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative border-l border-slate-200 ml-3 space-y-6">
                  {valuations.map((val) => (
                    <div key={val.id} className="mb-4 ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-emerald-100 rounded-full -left-3 ring-8 ring-white">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                      <h3 className="flex items-center text-md font-semibold text-slate-900">
                        {Number(val.valuation_amount).toLocaleString()} RWF
                        <span className="bg-slate-100 text-slate-800 text-xs font-normal ml-2 px-2.5 py-0.5 rounded">
                          {val.valuation_method}
                        </span>
                      </h3>
                      <time className="block mb-1 text-xs font-normal text-slate-400">
                        {new Date(val.valuation_date).toLocaleDateString()}
                      </time>
                      <p className="text-sm font-normal text-slate-600">{val.notes || 'No notes provided.'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: AUDIT & EVENTS */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Share System Event Log</CardTitle>
                <CardDescription>Immutable activity log of share allocations, vesting releases, and cancellations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between p-3 border rounded text-sm">
                      <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="font-semibold capitalize text-slate-900">{evt.event_type}</span>: {' '}
                          <span>{Number(evt.quantity).toLocaleString()} shares</span>
                          <p className="text-xs text-slate-500">{evt.reason}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(evt.event_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* DIALOG 1: GRANT / ALLOCATE SHARES */}
      <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Grant Equity / Allocate Shares</DialogTitle>
            <DialogDescription>
              Issue shares from authorized pools to founders, employees, or advisors.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAllocateShares} className="space-y-4">
            <div>
              <Label>Shareholder / Member</Label>
              <Select
                value={allocateForm.profile_id}
                onValueChange={(val) => setAllocateForm({ ...allocateForm, profile_id: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Holder Type</Label>
                <Select
                  value={allocateForm.holder_type}
                  onValueChange={(val) => setAllocateForm({ ...allocateForm, holder_type: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="founder">Founder</SelectItem>
                    <SelectItem value="employee">Employee (ESOP)</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Share Class Pool</Label>
                <Select
                  value={allocateForm.share_id}
                  onValueChange={(val) => setAllocateForm({ ...allocateForm, share_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((pool) => (
                      <SelectItem key={pool.id} value={pool.id}>
                        {pool.share_class.toUpperCase()} ({pool.company_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Quantity of Shares</Label>
              <Input
                type="number"
                min="1"
                className="mt-1"
                placeholder="e.g. 50000"
                value={allocateForm.quantity || ''}
                onChange={(e) => setAllocateForm({ ...allocateForm, quantity: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Reason / Grant Description</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Founder initial grant or ESOP Year 1"
                value={allocateForm.allocation_reason}
                onChange={(e) => setAllocateForm({ ...allocateForm, allocation_reason: e.target.value })}
              />
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Enable Vesting Schedule?</Label>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={allocateForm.enable_vesting}
                  onChange={(e) => setAllocateForm({ ...allocateForm, enable_vesting: e.target.checked })}
                />
              </div>

              {allocateForm.enable_vesting && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                  <div>
                    <Label className="text-xs">Vesting Period (Months)</Label>
                    <Input
                      type="number"
                      value={allocateForm.vesting_months}
                      onChange={(e) => setAllocateForm({ ...allocateForm, vesting_months: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cliff Period (Months)</Label>
                    <Input
                      type="number"
                      value={allocateForm.cliff_months}
                      onChange={(e) => setAllocateForm({ ...allocateForm, cliff_months: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAllocateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Complete Allocation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: UPDATE VALUATION */}
      <Dialog open={isValuationOpen} onOpenChange={setIsValuationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Company Valuation</DialogTitle>
            <DialogDescription>
              Update Sybella Systems overall valuation in RWF to recalculate share pricing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddValuation} className="space-y-4">
            <div>
              <Label>Valuation Amount (RWF)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 500000000"
                value={valuationForm.valuation_amount || ''}
                onChange={(e) => setValuationForm({ ...valuationForm, valuation_amount: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Valuation Method</Label>
              <Select
                value={valuationForm.valuation_method}
                onValueChange={(val) => setValuationForm({ ...valuationForm, valuation_method: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Revenue Multiple">Revenue Multiple</SelectItem>
                  <SelectItem value="Discounted Cash Flow (DCF)">Discounted Cash Flow (DCF)</SelectItem>
                  <SelectItem value="Priced Investment Round">Priced Investment Round</SelectItem>
                  <SelectItem value="Manual Appraisal">Manual Appraisal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes / Rationale</Label>
              <Textarea
                placeholder="Details about seed round or revenue growth..."
                value={valuationForm.notes}
                onChange={(e) => setValuationForm({ ...valuationForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsValuationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Valuation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: TERMINATE / RECLAIM UNVESTED SHARES */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Handle Departure / Cancel Grant</DialogTitle>
            <DialogDescription>
              Stop future vesting for {selectedAllocation?.profile?.full_name}. Vested shares will be kept while unvested shares are cancelled.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTerminateAllocation} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm space-y-1">
              <p className="font-semibold">Summary of Action:</p>
              <p>• Granted: {Number(selectedAllocation?.granted_quantity || selectedAllocation?.quantity).toLocaleString()} shares</p>
              <p>• Retained (Vested): {Number(selectedAllocation?.vested_quantity || 0).toLocaleString()} shares</p>
              <p>• Cancelled (Unvested): {Math.max(0, Number(selectedAllocation?.granted_quantity || selectedAllocation?.quantity || 0) - Number(selectedAllocation?.vested_quantity || 0)).toLocaleString()} shares</p>
            </div>

            <div>
              <Label>Reason for Termination / Cancellation</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Resignation or performance evaluation"
                value={terminateForm.reason}
                onChange={(e) => setTerminateForm({ ...terminateForm, reason: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="return_pool"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={terminateForm.returned_to_pool}
                onChange={(e) => setTerminateForm({ ...terminateForm, returned_to_pool: e.target.checked })}
              />
              <Label htmlFor="return_pool" className="text-sm font-normal">
                Return unvested shares back to the company pool for re-allocation
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsTerminateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}