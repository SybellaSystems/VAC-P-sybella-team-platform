'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Clock, FileText, DollarSign, Calendar, Key, Check, Ban, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApprovalWorkflow } from '@/lib/database.types';

const statusConfig: Record<string, { color: string; icon: any }> = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { color: 'bg-emerald-100 text-emerald-700', icon: Check },
  rejected: { color: 'bg-red-100 text-red-700', icon: Ban },
  cancelled: { color: 'bg-gray-100 text-gray-600', icon: X },
};

const entityIcons: Record<string, any> = { budget: DollarSign, leave: Calendar, credential_access: Key, report: FileText, other: FileText };

export default function ApprovalsPage() {
  const { profile } = useAuth();
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canManage = ['admin', 'director', 'manager', 'finance', 'hr'].includes(profile?.role || '');

  useEffect(() => { if (profile) fetchWorkflows(); }, [profile]);

  async function fetchWorkflows() {
    setLoading(true);
    const { data, error } = await supabase.from('approval_workflows').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load approvals'); setLoading(false); return; }
    setWorkflows((data as ApprovalWorkflow[]) || []);
    setLoading(false);
  }

  async function handleApprove(workflowId: string) {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;
    const newStep = workflow.current_step + 1;
    const isComplete = newStep >= workflow.total_steps;
    const { error } = await supabase.from('approval_workflows')
      .update({ current_step: newStep, status: isComplete ? 'approved' : 'pending', updated_at: new Date().toISOString() })
      .eq('id', workflowId);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success(isComplete ? 'Approval complete' : 'Step approved');
    fetchWorkflows();
  }

  async function handleReject(workflowId: string) {
    const { error } = await supabase.from('approval_workflows')
      .update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', workflowId);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Rejected');
    fetchWorkflows();
  }

  const pendingWorkflows = workflows.filter(w => w.status === 'pending');
  const completedWorkflows = workflows.filter(w => w.status !== 'pending');
  const displayWorkflows = activeTab === 'pending' ? pendingWorkflows : completedWorkflows;

  if (loading) return (<div><TopBar title="Approvals" subtitle="Loading..." />
    <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></div>);

  return (
    <div>
      <TopBar title="Approvals" subtitle={`${pendingWorkflows.length} pending · ${completedWorkflows.length} completed`} />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-white border border-input text-foreground hover:bg-muted'}`}>
            <Clock size={15} /> Pending ({pendingWorkflows.length})
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'completed' ? 'bg-primary text-primary-foreground' : 'bg-white border border-input text-foreground hover:bg-muted'}`}>
            <Check size={15} /> Completed
          </button>
        </div>

        {displayWorkflows.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            {activeTab === 'pending' ? <Check size={40} className="text-emerald-400 mx-auto mb-3" /> : <FileText size={40} className="text-slate-300 mx-auto mb-3" />}
            <p className="text-muted-foreground">{activeTab === 'pending' ? 'No pending approvals' : 'No completed approvals'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayWorkflows.map(workflow => {
              const EntityIcon = entityIcons[workflow.entity_type] || FileText;
              const statusCfg = statusConfig[workflow.status] || statusConfig.pending;
              const StatusIcon = statusCfg.icon;
              const isExpanded = expandedId === workflow.id;
              return (
                <div key={workflow.id} className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-lg bg-blue-50 flex-shrink-0"><EntityIcon size={18} className="text-blue-600" /></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">{workflow.workflow_name}</h3>
                          <p className="text-xs text-muted-foreground capitalize mt-0.5">{workflow.entity_type.replace('_', ' ')}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Step {workflow.current_step} of {workflow.total_steps}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusCfg.color} flex items-center gap-1`}><StatusIcon size={9} /> {workflow.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-input rounded-lg hover:bg-muted">
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {canManage && workflow.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleReject(workflow.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"><Ban size={11} /></button>
                            <button onClick={() => handleApprove(workflow.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Check size={11} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-4 pt-0 border-t border-border">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-sm">
                        <div><p className="text-xs text-muted-foreground">Entity Type</p><p className="font-medium text-foreground capitalize">{workflow.entity_type.replace('_', ' ')}</p></div>
                        <div><p className="text-xs text-muted-foreground">Current Step</p><p className="font-medium text-foreground">{workflow.current_step} / {workflow.total_steps}</p></div>
                        <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium text-foreground capitalize">{workflow.status}</p></div>
                        <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium text-foreground">{new Date(workflow.created_at).toLocaleDateString()}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
