'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartPie as PieChartIcon, Percent, TrendingUp, Users, CreditCard as Edit } from 'lucide-react';
import { toast } from 'sonner';
import { canManageShares } from '@/lib/rbac';
import type { Profile } from '@/lib/database.types';

type ShareRecord = {
  id: string;
  member_id: string;
  quantity: number;
  share_class: string;
  allocated_at: string;
  notes: string;
  member?: Profile;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function SharesPage() {
  const { profile } = useAuth();

  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [totalShares, setTotalShares] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shares')
        .select('*, member:profiles!shares_member_id_fkey(*)')
        .order('quantity', { ascending: false });

      if (error) throw error;

      setShares((data as ShareRecord[]) || []);
      const total = (data || []).reduce((sum, a) => sum + (a as ShareRecord).quantity, 0);
      setTotalShares(total);
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast.error('Failed to load share data');
    } finally {
      setLoading(false);
    }
  }

  const canEdit = canManageShares(profile?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Shares</h1>
          <p className="text-slate-600">Equity distribution and ownership</p>
        </div>
        {canEdit && (
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Manage Shares
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Shares</CardDescription>
            <CardTitle className="text-2xl">{totalShares.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shareholders</CardDescription>
            <CardTitle className="text-2xl">{shares.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Users className="h-4 w-4 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Common</CardDescription>
            <CardTitle className="text-2xl">{shares.filter(s => s.share_class === 'common').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Preferred</CardDescription>
            <CardTitle className="text-2xl">{shares.filter(s => s.share_class === 'preferred').length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Percent className="h-4 w-4 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shareholders</CardTitle>
          <CardDescription>All equity holders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <PieChartIcon className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No share allocations yet</p>
              </div>
            ) : (
              shares.map((share, index) => (
                <div key={share.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">
                      {share.member?.full_name || 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-xs">{share.share_class}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      {share.quantity.toLocaleString()} shares
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({((share.quantity / totalShares) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
