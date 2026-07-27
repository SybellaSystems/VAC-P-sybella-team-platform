'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarRange, Plus, CircleCheck as CheckCircle, Circle as XCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { canApproveLeave, canViewAllLeave } from '@/lib/rbac';
import type { LeaveRequest, Profile } from '@/lib/database.types';

export default function LeavePage() {
  const { profile } = useAuth();

  const [leaveRequests, setLeaveRequests] = useState<(LeaveRequest & { member?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('my');

  const [newRequest, setNewRequest] = useState({
    leave_type: 'vacation' as LeaveRequest['leave_type'],
    start_date: new Date(),
    end_date: new Date(),
    reason: '',
  });

  useEffect(() => {
    if (profile) {
      fetchLeaveRequests();
    }
  }, [profile]);

  async function fetchLeaveRequests() {
    setLoading(true);
    try {
      let query = supabase.from('leave_requests').select('*, member:profiles!leave_requests_member_id_fkey(*)');

      if (!canViewAllLeave(profile?.role)) {
        query = query.eq('member_id', profile?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setLeaveRequests(data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest() {
    if (!profile) return;

    try {
      const { error } = await supabase.from('leave_requests').insert({
        member_id: profile.id,
        leave_type: newRequest.leave_type,
        start_date: format(newRequest.start_date, 'yyyy-MM-dd'),
        end_date: format(newRequest.end_date, 'yyyy-MM-dd'),
        reason: newRequest.reason,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Leave request submitted');
      setShowRequestDialog(false);
      setNewRequest({ leave_type: 'vacation', start_date: new Date(), end_date: new Date(), reason: '' });
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  }

  async function handleApprove(requestId: string) {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Leave approved');
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave');
    }
  }

  async function handleReject(requestId: string) {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Leave rejected');
      fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave');
    }
  }

  const myRequests = leaveRequests.filter(r => r.member_id === profile?.id);
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const canApprove = canApproveLeave(profile?.role);
  const canViewAll = canViewAllLeave(profile?.role);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-amber-100 text-amber-800';
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Leave Management" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Leave Management" subtitle="Request and manage time off" />
      <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-600">Request and manage time off</p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Leave</DialogTitle>
              <DialogDescription>Submit a new leave request</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Leave Type</label>
                <Select value={newRequest.leave_type} onValueChange={(v: LeaveRequest['leave_type']) => setNewRequest({ ...newRequest, leave_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newRequest.start_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newRequest.start_date}
                        onSelect={(date) => date && setNewRequest({ ...newRequest, start_date: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newRequest.end_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newRequest.end_date}
                        onSelect={(date) => date && setNewRequest({ ...newRequest, end_date: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea value={newRequest.reason} onChange={e => setNewRequest({ ...newRequest, reason: e.target.value })} placeholder="Optional explanation" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmitRequest}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {canApprove && pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.slice(0, 5).map(request => (
              <div key={request.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{(request.member as Profile)?.full_name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">
                    {request.leave_type} • {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApprove(request.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canViewAll && (
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">All Leave Requests</h2>
          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarRange className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No leave requests</p>
              </CardContent>
            </Card>
          ) : (
            leaveRequests.map(request => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{(request.member as Profile)?.full_name || 'Unknown'}</h3>
                      <p className="text-sm text-slate-500">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getLeaveTypeColor(request.leave_type)}>{request.leave_type}</Badge>
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>
                      {request.reason && <p className="text-sm text-slate-600 mt-2">{request.reason}</p>}
                    </div>
                    {canApprove && request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleReject(request.id)}>Reject</Button>
                        <Button size="sm" onClick={() => handleApprove(request.id)}>Approve</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {!canViewAll && (
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">My Leave Requests</h2>
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarRange className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No leave requests</p>
              </CardContent>
            </Card>
          ) : (
            myRequests.map(request => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-slate-500">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getLeaveTypeColor(request.leave_type)}>{request.leave_type}</Badge>
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>
                      {request.reason && <p className="text-sm text-slate-600 mt-2">{request.reason}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      </div>
    </div>
  );
}
