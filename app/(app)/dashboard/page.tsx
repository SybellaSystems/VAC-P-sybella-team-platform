'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Project, Profile } from '@/lib/database.types';
import { Users, FolderKanban, DollarSign, TrendingUp, CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, Building2, Activity, ArrowUpRight, ArrowDownRight, Kanban, Play, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Stats {
  totalTeam: number; activeProjects: number; totalCustomers: number; monthlyRevenue: number; totalExpenses: number;
  tasksCompleted: number; tasksPending: number; tasksBlocked: number; projectsByStatus: Record<string, number>;
  openRisks: number; pendingApprovals: number;
}

interface AssignmentWithProject {
  id: string; role_in_project: string; can_edit_tasks: boolean;
  project: Project;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ totalTeam: 0, activeProjects: 0, totalCustomers: 0, monthlyRevenue: 0, totalExpenses: 0, tasksCompleted: 0, tasksPending: 0, tasksBlocked: 0, projectsByStatus: {}, openRisks: 0, pendingApprovals: 0 });
  const [myProjects, setMyProjects] = useState<AssignmentWithProject[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadData(); }, [profile]);

  const loadData = async () => {
    const [
      { count: teamCount },
      { data: projects },
      { count: custCount },
      { data: tasks },
      { data: finance },
      { count: riskCount },
      { count: approvalCount },
      { data: assignments },
      { data: activity },
      { data: myTasksData },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('tasks').select('*,project:projects!tasks_project_id_fkey(name,project_code)').order('created_at', { ascending: false }).limit(8),
      supabase.from('financial_records').select('amount,type'),
      supabase.from('project_risks').select('id', { count: 'exact' }).eq('status', 'open'),
      supabase.from('budget_proposals').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('project_assignments').select('*,project:projects!project_assignments_project_id_fkey(*)').eq('member_id', profile!.id),
      supabase.from('project_activity_log').select('*,project:projects!project_activity_log_project_id_fkey(name)').order('created_at', { ascending: false }).limit(10),
      supabase.from('tasks').select('*,project:projects!tasks_project_id_fkey(id,name,project_code)').eq('assigned_to', profile!.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const projectsByStatus: Record<string, number> = {};
    (projects || []).forEach((p: Project) => { projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1; });
    const revenue = (finance || []).filter((r: any) => r.type === 'income').reduce((s: number, r: any) => s + (r.amount || 0), 0);
    const expenses = (finance || []).filter((r: any) => r.type === 'expense').reduce((s: number, r: any) => s + (r.amount || 0), 0);

    setStats({
      totalTeam: teamCount || 0, activeProjects: (projects || []).filter((p: Project) => p.status === 'active').length,
      totalCustomers: custCount || 0, monthlyRevenue: revenue, totalExpenses: expenses,
      tasksCompleted: (tasks || []).filter((t: any) => t.status === 'done').length,
      tasksPending: (tasks || []).filter((t: any) => t.status === 'todo' || t.status === 'in_progress').length,
      tasksBlocked: (tasks || []).filter((t: any) => t.status === 'blocked').length,
      projectsByStatus, openRisks: riskCount || 0, pendingApprovals: approvalCount || 0,
    });
    setMyProjects((assignments as AssignmentWithProject[]) || []);
    setRecentActivity(activity || []);
    setMyTasks(myTasksData || []);
    setLoading(false);
  };

  const acceptTask = async (taskId: string, taskTitle: string) => {
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);
    await supabase.from('project_activity_log').insert({
      project_id: myTasks.find(t => t.id === taskId)?.project?.id,
      action: 'task_accepted', description: `Task "${taskTitle}" accepted and started by ${profile?.full_name}`,
      actor_id: profile?.id,
    });
    toast.success('Task accepted and started');
    loadData();
  };

  const completeTask = async (taskId: string, taskTitle: string) => {
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', taskId);
    await supabase.from('project_activity_log').insert({
      project_id: myTasks.find(t => t.id === taskId)?.project?.id,
      action: 'task_completed', description: `Task "${taskTitle}" completed by ${profile?.full_name}`,
      actor_id: profile?.id,
    });
    toast.success('Task completed');
    loadData();
  };

  if (loading) return (<div><TopBar title="Dashboard" subtitle="Loading..." /><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div></div>);

  const statCards = [
    { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: 'bg-blue-50 text-blue-600', trend: '+2', positive: true },
    { label: 'Team Members', value: stats.totalTeam, icon: Users, color: 'bg-purple-50 text-purple-600', trend: '+1', positive: true },
    { label: 'Total Revenue', value: `$${(stats.monthlyRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: 'bg-teal-50 text-teal-600', trend: '+12%', positive: true },
    { label: 'Open Risks', value: stats.openRisks, icon: AlertTriangle, color: 'bg-red-50 text-red-600', trend: stats.openRisks > 0 ? '!' : '0', positive: stats.openRisks === 0 },
    { label: 'Pending Approvals', value: stats.pendingApprovals, icon: CheckCircle2, color: 'bg-amber-50 text-amber-600', trend: stats.pendingApprovals > 0 ? '!' : '0', positive: stats.pendingApprovals === 0 },
    { label: 'Total Expenses', value: `$${(stats.totalExpenses / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'bg-orange-50 text-orange-600', trend: '-3%', positive: false },
  ];

  return (
    <div>
      <TopBar title="Dashboard" subtitle={`Welcome back, ${profile?.full_name?.split(' ')[0]}`} />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {statCards.map(({ label, value, icon: Icon, color, trend, positive }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={16} /></div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>{positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{trend}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* My Projects */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-semibold text-foreground">My Assigned Projects</h2>
              <button onClick={() => router.push('/projects')} className="text-xs text-primary hover:underline">View all</button></div>
            {myProjects.length === 0 ? (
              <div className="text-center py-8"><Kanban size={32} className="text-muted-foreground mx-auto mb-2 opacity-40" /><p className="text-sm text-muted-foreground">You are not assigned to any projects yet.</p></div>
            ) : (
              <div className="space-y-3">
                {myProjects.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary/40 cursor-pointer transition-all" onClick={() => router.push(`/projects/${a.project.id}`)}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><FolderKanban size={18} className="text-primary" /></div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{a.project.name}</p>
                      <p className="text-xs text-muted-foreground">Role: {a.role_in_project.replace('_', ' ')} · {a.project.progress}% complete</p></div>
                    <div className="w-20 h-1.5 bg-muted rounded-full"><div className="h-1.5 bg-primary rounded-full" style={{ width: `${a.project.progress}%` }} /></div>
                  </div>))}
              </div>)}
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">My Tasks</h2>
            {myTasks.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">No tasks assigned to you.</p>) : (
              <div className="space-y-2">
                {myTasks.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.project?.name || ''}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {t.status === 'todo' && <button onClick={e => { e.stopPropagation(); acceptTask(t.id, t.title); }} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Play size={11} /> Start</button>}
                      {t.status === 'in_progress' && <button onClick={e => { e.stopPropagation(); completeTask(t.id, t.title); }} className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Check size={11} /> Complete</button>}
                      {t.status === 'done' && <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={11} /> Done</span>}
                      <span className="text-xs text-muted-foreground capitalize">{t.status.replace('_',' ')}</span>
                    </div>
                  </div>))}
              </div>)}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity Across Platform</h2>
          {recentActivity.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>) : (
            <div className="space-y-2">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 hover:bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Activity size={14} className="text-primary" /></div>
                  <div className="flex-1"><p className="text-sm text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.project?.name || ''} · {new Date(a.created_at).toLocaleString()}</p></div>
                </div>))}
            </div>)}
        </div>
      </div>
    </div>
  );
}
