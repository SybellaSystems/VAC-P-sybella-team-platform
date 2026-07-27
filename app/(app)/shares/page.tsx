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
  UserPlus,
  Briefcase,
  Layers,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import { canManageShares } from '@/lib/rbac';
import type { Profile } from '@/lib/database.types';

// Types matching your exact schema definitions
type SharePool = {
  id: string;
  company_name: string;
  share_class: string;
  total_units: number;
  authorized_units: number;
  issued_units: number;
  reserved_units: number;
  cancelled_units: number;
  par_value: number;
  current_price_per_unit: number;
  currency: string;
};

type OwnershipRecord = {
  id: string;
  share_id: string;
  user_id: string;
  units: number;
  share_value: number;
  market_cap: number;
  acquired_at: string;
  profile?: Profile;
  share?: SharePool;
};

type ShareAllocation = {
  id: string;
  share_id: string;
  profile_id?: string | null;
  external_party_name?: string | null;
  external_party_email?: string | null;
  units: number;
  quantity: number;
  granted_quantity: number;
  vested_quantity: number;
  cancelled_quantity: number;
  returned_to_pool: boolean;
  share_value: number;
  acquisition_value: number;
  allocation_type: 'internal' | 'external';
  status: 'active' | 'paused' | 'terminated' | 'cancelled';
  allocated_at: string;
  currency: string;
  profile?: Profile;
  share_pool?: SharePool;
};

type CompanyValuation = {
  id: string;
  company_name: string;
  valuation_amount: number;
  valuation_method: string;
  valuation_date: string;
  currency: string;
  revenue?: number;
  expenses?: number;
  profit?: number;
};

type SharePriceHistory = {
  id: string;
  share_id: string;
  price_per_unit: number;
  company_value: number;
  valuation_date: string;
  valuation_method: string;
  currency: string;
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
  const [pools, setPools] = useState<SharePool[]>([]);
  const [ownershipRecords, setOwnershipRecords] = useState<OwnershipRecord[]>([]);
  const [allocations, setAllocations] = useState<ShareAllocation[]>([]);
  const [valuations, setValuations] = useState<CompanyValuation[]>([]);
  const [priceHistory, setPriceHistory] = useState<SharePriceHistory[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<ShareEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog Controls
  const [isCreatePoolOpen, setIsCreatePoolOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [isValuationOpen, setIsValuationOpen] = useState(false);
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<ShareAllocation | null>(null);

  // Form States
  const [poolForm, setPoolForm] = useState({
    company_name: 'Sybella Systems',
    share_class: 'Common Class A',
    authorized_units: 1000000,
    reserved_units: 100000,
    par_value: 1,
    current_price_per_unit: 500,
  });

  const [allocateForm, setAllocateForm] = useState({
    share_id: '',
    allocation_type: 'internal' as 'internal' | 'external',
    profile_id: '',
    external_party_name: '',
    external_party_email: '',
    units: 0,
    acquisition_value: 0,
    enable_vesting: true,
    vesting_months: 48,
    cliff_months: 12,
    reason: 'Initial Grant',
  });

  const [valuationForm, setValuationForm] = useState({
    share_id: '',
    valuation_method: 'Revenue Multiple',
    valuation_amount: 0,
    notes: '',
  });

  const [terminateForm, setTerminateForm] = useState({
    reason: 'Departure / Agreement ended',
    returned_to_pool: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Share Pools
      const { data: poolData } = await supabase.from('shares').select('*');

      // 2. Fetch Ownership Records with profiles & shares
      const { data: ownerData } = await supabase
        .from('ownership_records')
        .select('*, profile:profiles(*), share:shares(*)')
        .order('units', { ascending: false });

      // 3. Fetch Allocations
      const { data: allocData } = await supabase
        .from('share_allocations')
        .select('*, profile:profiles(*), share_pool:shares(*)')
        .order('allocated_at', { ascending: false });

      // 4. Fetch Valuations
      const { data: valData } = await supabase
        .from('company_valuations')
        .select('*')
        .order('valuation_date', { ascending: false });

      // 5. Fetch Price History
      const { data: priceData } = await supabase
        .from('share_price_history')
        .select('*')
        .order('valuation_date', { ascending: false });

      // 6. Fetch Profiles for internal allocation dropdown
      const { data: profData } = await supabase.from('profiles').select('*');

      // 7. Fetch Events
      const { data: eventData } = await supabase
        .from('share_events')
        .select('*')
        .order('event_date', { ascending: false })
        .limit(25);

      setPools((poolData as SharePool[]) || []);
      setOwnershipRecords((ownerData as OwnershipRecord[]) || []);
      setAllocations((allocData as ShareAllocation[]) || []);
      setValuations((valData as CompanyValuation[]) || []);
      setPriceHistory((priceData as SharePriceHistory[]) || []);
      setProfiles((profData as Profile[]) || []);
      setEvents((eventData as ShareEvent[]) || []);
    } catch (error) {
      console.error('Error fetching share data:', error);
      toast.error('Failed to load cap table data');
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
    () => pools.reduce((acc, p) => acc + Number(p.issued_units || 0), 0),
    [pools]
  );

  const pricePerShare = totalIssued > 0 ? latestValuation / totalIssued : pools[0]?.current_price_per_unit || 0;

  const canEdit = canManageShares(profile?.role);

  // Form Handlers

  // 1. Create Share Instrument Pool
  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.from('shares').insert([
        {
          company_name: poolForm.company_name,
          share_class: poolForm.share_class,
          authorized_units: poolForm.authorized_units,
          total_units: poolForm.authorized_units,
          issued_units: 0,
          reserved_units: poolForm.reserved_units,
          cancelled_units: 0,
          par_value: poolForm.par_value,
          current_price_per_unit: poolForm.current_price_per_unit,
          currency: 'RWF',
        },
      ]);

      if (error) throw error;

      toast.success('Share pool created successfully!');
      setIsCreatePoolOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create share pool');
    }
  }

  // 2. Grant / Allocate Shares
  async function handleAllocateShares(e: React.FormEvent) {
    e.preventDefault();
    if (!allocateForm.share_id || allocateForm.units <= 0) {
      toast.error('Please select a share pool and enter valid units');
      return;
    }

    if (allocateForm.allocation_type === 'internal' && !allocateForm.profile_id) {
      toast.error('Please select an internal team member');
      return;
    }

    if (allocateForm.allocation_type === 'external' && !allocateForm.external_party_name) {
      toast.error('Please specify the external party name');
      return;
    }

    try {
      const selectedPool = pools.find((p) => p.id === allocateForm.share_id);
      const computedValue = allocateForm.units * (selectedPool?.current_price_per_unit || pricePerShare);

      // Insert share_allocation
      const { data: alloc, error: allocErr } = await supabase
        .from('share_allocations')
        .insert([
          {
            share_id: allocateForm.share_id,
            allocation_type: allocateForm.allocation_type,
            profile_id: allocateForm.allocation_type === 'internal' ? allocateForm.profile_id : null,
            external_party_name: allocateForm.allocation_type === 'external' ? allocateForm.external_party_name : null,
            external_party_email: allocateForm.allocation_type === 'external' ? allocateForm.external_party_email : null,
            units: allocateForm.units,
            quantity: allocateForm.units,
            granted_quantity: allocateForm.units,
            vested_quantity: allocateForm.enable_vesting ? 0 : allocateForm.units,
            cancelled_quantity: 0,
            share_value: computedValue,
            acquisition_value: allocateForm.acquisition_value,
            status: 'active',
            currency: 'RWF',
          },
        ])
        .select()
        .single();

      if (allocErr) throw allocErr;

      // Create Share Vesting Schedule if enabled
      if (allocateForm.enable_vesting && alloc) {
        await supabase.from('share_vesting').insert([
          {
            allocation_id: alloc.id,
            start_date: new Date().toISOString().split('T')[0],
            vesting_months: allocateForm.vesting_months,
            cliff_months: allocateForm.cliff_months,
            vested_quantity: 0,
            status: 'active',
          },
        ]);
      }

      // Record Share Event
      await supabase.from('share_events').insert([
        {
          allocation_id: alloc.id,
          event_type: 'issuance',
          quantity: allocateForm.units,
          event_date: new Date().toISOString(),
          reason: allocateForm.reason || 'Initial Grant',
          approved_by: profile?.id,
        },
      ]);

      // Update Share Pool Issued Units & Transaction
      if (selectedPool) {
        const updatedIssued = Number(selectedPool.issued_units || 0) + Number(allocateForm.units);
        await supabase
          .from('shares')
          .update({ issued_units: updatedIssued })
          .eq('id', selectedPool.id);

        await supabase.from('share_pool_transactions').insert([
          {
            share_id: selectedPool.id,
            transaction_type: 'issuance',
            quantity: allocateForm.units,
            transaction_date: new Date().toISOString(),
            reason: allocateForm.reason,
            approved_by: profile?.id,
          },
        ]);
      }

      // Upsert Ownership Record for internal holders
      if (allocateForm.allocation_type === 'internal' && allocateForm.profile_id) {
        const existingRecord = ownershipRecords.find(
          (o) => o.user_id === allocateForm.profile_id && o.share_id === allocateForm.share_id
        );

        if (existingRecord) {
          const newUnits = Number(existingRecord.units) + Number(allocateForm.units);
          await supabase
            .from('ownership_records')
            .update({
              units: newUnits,
              share_value: newUnits * pricePerShare,
            })
            .eq('id', existingRecord.id);
        } else {
          await supabase.from('ownership_records').insert([
            {
              share_id: allocateForm.share_id,
              user_id: allocateForm.profile_id,
              units: allocateForm.units,
              share_value: computedValue,
              market_cap: latestValuation,
            },
          ]);
        }
      }

      toast.success('Shares allocated and cap table updated!');
      setIsAllocateOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to allocate shares');
    }
  }

  // 3. Update Valuation & Record Share Price History
  async function handleAddValuation(e: React.FormEvent) {
    e.preventDefault();
    if (valuationForm.valuation_amount <= 0) {
      toast.error('Valuation must be greater than zero');
      return;
    }

    try {
      // 1. Save company valuation
      const { data: val, error: valErr } = await supabase
        .from('company_valuations')
        .insert([
          {
            company_name: 'Sybella Systems',
            valuation_amount: valuationForm.valuation_amount,
            valuation_method: valuationForm.valuation_method,
            valuation_date: new Date().toISOString().split('T')[0],
            currency: 'RWF',
          },
        ])
        .select()
        .single();

      if (valErr) throw valErr;

      // 2. Compute price per unit
      const calculatedPrice = totalIssued > 0 ? valuationForm.valuation_amount / totalIssued : 0;

      // 3. Save share_price_history if a pool was selected
      if (valuationForm.share_id) {
        await supabase.from('share_price_history').insert([
          {
            share_id: valuationForm.share_id,
            price_per_unit: calculatedPrice,
            company_value: valuationForm.valuation_amount,
            valuation_date: new Date().toISOString().split('T')[0],
            valuation_method: valuationForm.valuation_method,
            currency: 'RWF',
          },
        ]);

        // Update pool's current price
        await supabase
          .from('shares')
          .update({ current_price_per_unit: calculatedPrice })
          .eq('id', valuationForm.share_id);
      }

      toast.success('Company valuation and price history updated!');
      setIsValuationOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update valuation');
    }
  }

  // 4. Terminate / Reclaim Allocation
  async function handleTerminateAllocation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAllocation) return;

    try {
      const vested = Number(selectedAllocation.vested_quantity || 0);
      const total = Number(selectedAllocation.quantity || selectedAllocation.units);
      const unvested = Math.max(0, total - vested);

      // Update share_allocation status
      await supabase
        .from('share_allocations')
        .update({
          status: 'terminated',
          units: vested,
          quantity: vested,
          cancelled_quantity: unvested,
          returned_to_pool: terminateForm.returned_to_pool,
        })
        .eq('id', selectedAllocation.id);

      // Update share_vesting status
      await supabase
        .from('share_vesting')
        .update({
          status: 'terminated',
          terminated_at: new Date().toISOString(),
          termination_reason: terminateForm.reason,
        })
        .eq('allocation_id', selectedAllocation.id);

      // Log share event
      await supabase.from('share_events').insert([
        {
          allocation_id: selectedAllocation.id,
          event_type: 'cancellation',
          quantity: unvested,
          event_date: new Date().toISOString(),
          reason: terminateForm.reason,
          approved_by: profile?.id,
        },
      ]);

      // Reclaim shares into pool
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

      toast.success('Allocation terminated and unvested shares processed!');
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
        <TopBar title="Company Shares & Equity" subtitle="Loading cap table data..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Company Shares" subtitle="Cap Table, Share Allocations & Valuations" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cap Table & Share Issuance</h1>
            <p className="text-sm text-slate-500">
              Manage share instrument pools, allocate units to members/investors, and track pricing in RWF.
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsCreatePoolOpen(true)}>
                <Layers className="mr-2 h-4 w-4 text-blue-600" />
                New Share Pool
              </Button>
              <Button variant="outline" onClick={() => setIsValuationOpen(true)}>
                <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
                Update Valuation
              </Button>
              <Button onClick={() => setIsAllocateOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Allocate Shares
              </Button>
            </div>
          )}
        </div>

        {/* Executive Summary Metric Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Company Valuation</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {latestValuation.toLocaleString()} Frw
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Method: {valuations[0]?.valuation_method || 'N/A'}</span>
              <Building2 className="h-4 w-4 text-emerald-600" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Price Per Unit</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })} Frw
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Valuation ÷ Issued Shares</span>
              <Coins className="h-4 w-4 text-amber-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Issued Shares</CardDescription>
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
              <CardDescription>Active Holders</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">
                {allocations.filter((a) => a.status === 'active').length}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Internal Members & External</span>
              <Users className="h-4 w-4 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        {/* Primary Tabs */}
        <Tabs defaultValue="captable" className="space-y-4">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="captable">Ownership Records (Cap Table)</TabsTrigger>
            <TabsTrigger value="allocations">Share Grants & Allocations</TabsTrigger>
            <TabsTrigger value="pools">Share Instrument Pools</TabsTrigger>
            <TabsTrigger value="pricing">Valuation & Pricing History</TabsTrigger>
            <TabsTrigger value="events">Audit Trail</TabsTrigger>
          </TabsList>

          {/* TAB 1: OWNERSHIP RECORDS / CAP TABLE */}
          <TabsContent value="captable">
            <Card>
              <CardHeader>
                <CardTitle>Cap Table Ownership Distribution</CardTitle>
                <CardDescription>
                  Real-time units and share value held by internal profile members based on `ownership_records`.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ownershipRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <PieChartIcon className="h-12 w-12 mb-3 stroke-1" />
                    <p>No ownership records created yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {ownershipRecords.map((owner, idx) => {
                      const ownershipPct = totalIssued > 0 ? (Number(owner.units) / totalIssued) * 100 : 0;
                      const calculatedVal = Number(owner.units) * pricePerShare;

                      return (
                        <div key={owner.id} className="py-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900">
                                  {owner.profile?.full_name || 'System Member'}
                                </span>
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {owner.profile?.role || 'Member'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Class: {owner.share?.share_class || 'Common'} • Acquired:{' '}
                                {new Date(owner.acquired_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">
                              {Number(owner.units).toLocaleString()} units
                            </div>
                            <div className="text-xs text-slate-500">{ownershipPct.toFixed(2)}% ownership</div>
                            <div className="text-xs font-medium text-emerald-600">
                              ~{Math.round(calculatedVal).toLocaleString()} Frw
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: SHARE ALLOCATIONS */}
          <TabsContent value="allocations">
            <Card>
              <CardHeader>
                <CardTitle>Share Grants & Issuance Log</CardTitle>
                <CardDescription>
                  Detailed log of internal grants and external party share allocations from `share_allocations`.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100">
                  {allocations.map((alloc) => {
                    const isInternal = alloc.allocation_type === 'internal';
                    const holderName = isInternal
                      ? alloc.profile?.full_name || 'Internal Member'
                      : alloc.external_party_name || 'External Investor/Advisor';
                    const isTerminated = alloc.status === 'terminated';

                    return (
                      <div
                        key={alloc.id}
                        className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isTerminated ? 'opacity-60 bg-slate-50/50 p-2 rounded' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{holderName}</span>
                            <Badge variant={isInternal ? 'default' : 'outline'} className="text-xs capitalize">
                              {alloc.allocation_type}
                            </Badge>
                            <Badge
                              variant={isTerminated ? 'destructive' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {alloc.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Allocated on {new Date(alloc.allocated_at).toLocaleDateString()} • Pool:{' '}
                            {alloc.share_pool?.share_class || 'Standard'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 text-right">
                          <div>
                            <div className="text-sm font-bold text-slate-900">
                              {Number(alloc.units || alloc.quantity).toLocaleString()} units
                            </div>
                            <div className="text-xs text-slate-500">
                              Vested: {Number(alloc.vested_quantity || 0).toLocaleString()}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-emerald-600">
                              {Number(alloc.share_value || 0).toLocaleString()} Frw
                            </div>
                            <div className="text-xs text-slate-400">Total Value</div>
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
                              Reclaim
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: SHARE POOLS */}
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
                      <CardDescription>
                        Price per unit: {Number(pool.current_price_per_unit || pricePerShare).toLocaleString()} Frw
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Authorized Units</span>
                          <span className="font-bold text-slate-800">
                            {Number(pool.authorized_units).toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded border">
                          <span className="text-slate-500 text-xs block">Issued Units</span>
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
                          <span className="text-slate-500 text-xs block">Available Units</span>
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

          {/* TAB 4: VALUATION & PRICING HISTORY */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Historical Share Pricing & Company Valuations</CardTitle>
                <CardDescription>
                  Trajectory log from `company_valuations` and `share_price_history`.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative border-l border-slate-200 ml-3 space-y-6">
                  {valuations.map((val) => (
                    <div key={val.id} className="mb-4 ml-6">
                      <span className="absolute flex items-center justify-center w-6 h-6 bg-emerald-100 rounded-full -left-3 ring-8 ring-white">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                      <h3 className="flex items-center text-md font-semibold text-slate-900">
                        {Number(val.valuation_amount).toLocaleString()} Frw
                        <span className="bg-slate-100 text-slate-800 text-xs font-normal ml-2 px-2.5 py-0.5 rounded">
                          {val.valuation_method}
                        </span>
                      </h3>
                      <time className="block mb-1 text-xs font-normal text-slate-400">
                        {new Date(val.valuation_date).toLocaleDateString()}
                      </time>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: AUDIT TRAIL */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>Share Ledger & Event Log</CardTitle>
                <CardDescription>
                  Recorded occurrences from `share_events` and pool movements.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between p-3 border rounded text-sm">
                      <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="font-semibold capitalize text-slate-900">{evt.event_type}</span>: {' '}
                          <span>{Number(evt.quantity).toLocaleString()} units</span>
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

      {/* MODAL 1: CREATE SHARE POOL */}
      <Dialog open={isCreatePoolOpen} onOpenChange={setIsCreatePoolOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create Share Instrument Pool</DialogTitle>
            <DialogDescription>
              Create a share pool instrument (e.g. Common Class A or ESOP Pool).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePool} className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input
                className="mt-1"
                value={poolForm.company_name}
                onChange={(e) => setPoolForm({ ...poolForm, company_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Share Class</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Common Class A or Preferred"
                value={poolForm.share_class}
                onChange={(e) => setPoolForm({ ...poolForm, share_class: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Authorized Units</Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  value={poolForm.authorized_units}
                  onChange={(e) => setPoolForm({ ...poolForm, authorized_units: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Reserved Units (ESOP)</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={poolForm.reserved_units}
                  onChange={(e) => setPoolForm({ ...poolForm, reserved_units: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Par Value (Frw)</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={poolForm.par_value}
                  onChange={(e) => setPoolForm({ ...poolForm, par_value: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Initial Price / Unit (Frw)</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={poolForm.current_price_per_unit}
                  onChange={(e) =>
                    setPoolForm({ ...poolForm, current_price_per_unit: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreatePoolOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Pool</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GRANT / ALLOCATE SHARES */}
      <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Allocate Shares</DialogTitle>
            <DialogDescription>
              Grant share units from a pool to internal members or external stakeholders.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAllocateShares} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Allocation Type</Label>
                <Select
                  value={allocateForm.allocation_type}
                  onValueChange={(val: 'internal' | 'external') =>
                    setAllocateForm({ ...allocateForm, allocation_type: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Team Member</SelectItem>
                    <SelectItem value="external">External Party / Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Share Pool</Label>
                <Select
                  value={allocateForm.share_id}
                  onValueChange={(val) => setAllocateForm({ ...allocateForm, share_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.share_class} ({p.company_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Select Profile for Internal Allocations */}
            {allocateForm.allocation_type === 'internal' ? (
              <div>
                <Label>Select Member from Profiles</Label>
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
                        {p.full_name || 'Unnamed'} ({p.role || 'Member'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              /* External Party Inputs */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>External Party Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g. Angel Investor"
                    value={allocateForm.external_party_name}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, external_party_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>External Party Email</Label>
                  <Input
                    type="email"
                    className="mt-1"
                    placeholder="investor@fund.com"
                    value={allocateForm.external_party_email}
                    onChange={(e) =>
                      setAllocateForm({ ...allocateForm, external_party_email: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Units / Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  className="mt-1"
                  value={allocateForm.units || ''}
                  onChange={(e) => setAllocateForm({ ...allocateForm, units: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>Acquisition Value (Frw)</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1"
                  value={allocateForm.acquisition_value || ''}
                  onChange={(e) =>
                    setAllocateForm({ ...allocateForm, acquisition_value: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Grant Rationale / Reason</Label>
              <Input
                className="mt-1"
                placeholder="e.g. Founder initial share grant or advisor agreement"
                value={allocateForm.reason}
                onChange={(e) => setAllocateForm({ ...allocateForm, reason: e.target.value })}
              />
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Attach Vesting Schedule?</Label>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  checked={allocateForm.enable_vesting}
                  onChange={(e) => setAllocateForm({ ...allocateForm, enable_vesting: e.target.checked })}
                />
              </div>

              {allocateForm.enable_vesting && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                  <div>
                    <Label className="text-xs">Vesting Months</Label>
                    <Input
                      type="number"
                      value={allocateForm.vesting_months}
                      onChange={(e) =>
                        setAllocateForm({ ...allocateForm, vesting_months: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cliff Months</Label>
                    <Input
                      type="number"
                      value={allocateForm.cliff_months}
                      onChange={(e) =>
                        setAllocateForm({ ...allocateForm, cliff_months: Number(e.target.value) })
                      }
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

      {/* MODAL 3: UPDATE VALUATION */}
      <Dialog open={isValuationOpen} onOpenChange={setIsValuationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Valuation & Price</DialogTitle>
            <DialogDescription>
              Update overall valuation in Frw and sync unit prices in `share_price_history`.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddValuation} className="space-y-4">
            <div>
              <Label>Target Share Pool</Label>
              <Select
                value={valuationForm.share_id}
                onValueChange={(val) => setValuationForm({ ...valuationForm, share_id: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select share instrument" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.share_class} ({p.company_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Company Valuation (Frw)</Label>
              <Input
                type="number"
                min="1"
                className="mt-1"
                placeholder="e.g. 500000000"
                value={valuationForm.valuation_amount || ''}
                onChange={(e) =>
                  setValuationForm({ ...valuationForm, valuation_amount: Number(e.target.value) })
                }
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

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsValuationOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Valuation</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: TERMINATE / RECLAIM SHARES */}
      <Dialog open={isTerminateOpen} onOpenChange={setIsTerminateOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Reclaim / Terminate Allocation</DialogTitle>
            <DialogDescription>
              Cancel unvested share units and update `share_allocations` status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTerminateAllocation} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm space-y-1">
              <p className="font-semibold">Allocation Summary:</p>
              <p>• Granted: {Number(selectedAllocation?.granted_quantity || selectedAllocation?.units).toLocaleString()} units</p>
              <p>• Vested: {Number(selectedAllocation?.vested_quantity || 0).toLocaleString()} units</p>
              <p>
                • Unvested to Reclaim:{' '}
                {Math.max(
                  0,
                  Number(selectedAllocation?.granted_quantity || selectedAllocation?.units || 0) -
                    Number(selectedAllocation?.vested_quantity || 0)
                ).toLocaleString()}{' '}
                units
              </p>
            </div>

            <div>
              <Label>Reason for Cancellation</Label>
              <Input
                className="mt-1"
                value={terminateForm.reason}
                onChange={(e) => setTerminateForm({ ...terminateForm, reason: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="return_to_pool"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={terminateForm.returned_to_pool}
                onChange={(e) => setTerminateForm({ ...terminateForm, returned_to_pool: e.target.checked })}
              />
              <Label htmlFor="return_to_pool" className="text-sm font-normal">
                Return reclaimed units to share pool (`returned_to_pool = true`)
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