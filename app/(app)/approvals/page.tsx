'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CircleCheck as CheckCircle, Circle as XCircle, Clock, FileText, DollarSign, Calendar, Key } from 'lucide-react';
import { toast } from 'sonner';
import type { ApprovalWorkflow, ApprovalStep, Profile } from '@/lib/database.types';

export default function ApprovalsPage() {
  const { profile } = useAuth();

  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (profile) {
      fetchWorkflows();
    }
  }, [profile]);

  async function fetchWorkflows() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(workflowId: string) {
    if (!profile) return;

    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      const newStep = workflow.current_step + 1;
      const isComplete = newStep >= workflow.total_steps;

      const { error } = await supabase
        .from('approval_workflows')
        .update({
          current_step: newStep,
          status: isComplete ? 'approved' : 'pending',
        })
        .eq('id', workflowId);

      if (error) throw error;

      toast.success(isComplete ? 'Approval complete' : 'Step approved');
      fetchWorkflows();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    }
  }

  async function handleReject(workflowId: string) {
    try {
      const { error } = await supabase
        .from('approval_workflows')
        .update({ status: 'rejected' })
        .eq('id', workflowId);

      if (error) throw error;

      toast.success('Rejected');
      fetchWorkflows();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    }
  }

  const pendingWorkflows = workflows.filter(w => w.status === 'pending');
  const completedWorkflows = workflows.filter(w => w.status !== 'pending');

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'budget': return <DollarSign className="h-5 w-5" />;
      case 'leave': return <Calendar className="h-5 w-5" />;
      case 'credential_access': return <Key className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
        <p className="text-slate-600">Review and approve pending requests</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-4 w-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-300 mb-4" />
                <p className="text-slate-500">No pending approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingWorkflows.map(workflow => (
                <Card key={workflow.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-blue-100">
                          {getEntityIcon(workflow.entity_type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{workflow.workflow_name}</h3>
                          <p className="text-slate-600 capitalize">{workflow.entity_type.replace('_', ' ')}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              Step {workflow.current_step} of {workflow.total_steps}
                            </Badge>
                            <Badge className={getStatusColor(workflow.status)}>
                              {workflow.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleReject(workflow.id)}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(workflow.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No completed approvals</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedWorkflows.map(workflow => (
                <Card key={workflow.id} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-slate-100">
                        {getEntityIcon(workflow.entity_type)}
                      </div>
                      <div>
                        <h3 className="font-semibold">{workflow.workflow_name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{workflow.entity_type.replace('_', ' ')}</p>
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
