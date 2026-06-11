'use client';


import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Users, FolderKanban, DollarSign, TrendingUp, CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, Building2, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Project, Task } from '@/lib/database.types';

interface Stats {
  totalTeam: number;
  activeProjects: number;
  totalCustomers: number;
  monthlyRevenue: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksBlocked: number;
  projectsByStatus: Record<string, number>;
}

interface RevenueChartData {
  month: string;
  revenue: number;
  expenses: number;
}

const COLORS = ['hsl(213,88%,40%)', 'hsl(158,60%,40%)', 'hsl(35,82%,50%)', 'hsl(0,72%,51%)','hsl(215,15%,60%)'];

export default function DashboardPage() {
  useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTeam: 0, activeProjects: 0, totalCustomers: 0, monthlyRevenue: 0,
    tasksCompleted: 0, tasksPending: 0, tasksBlocked: 0, projectsByStatus: {},
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueChartData[]>([]);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const [
        { count: teamCount },
        { data: projects },
        { count: custCount },
        { data: tasks },
        { data: finance },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(8),
        supabase
          .from('financial_records')
          .select('amount,type,created_at'),
      ]);

      const projectsByStatus: Record<string, number> = {};
      projects?.forEach((p: any) => {
        projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
      });

      const revenue = finance?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) ?? 0;

      const monthlyMap: Record<string, { revenue: number; expenses: number }> = {};

      finance?.forEach((record: any) => {
        if (!record.created_at) return;

        const date = new Date(record.created_at);

        const month = date.toLocaleString('default', {
          month: 'short',
        });

        if (!monthlyMap[month]) {
          monthlyMap[month] = {
            revenue: 0,
            expenses: 0,
          };
        }

        if (record.type === 'income') {
          monthlyMap[month].revenue += Number(record.amount || 0);
        }

        if (record.type === 'expense') {
          monthlyMap[month].expenses += Number(record.amount || 0);
        }
      });

      const monthOrder = [
        'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'
      ];

      const formattedRevenueData = Object.entries(monthlyMap).map(([month, values]) => ({
        month,
        revenue: values.revenue,
        expenses: values.expenses,
      })).sort(
        (a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)
      );

      setRevenueData(formattedRevenueData);

      setStats({
        totalTeam: teamCount ?? 0,
        activeProjects: projects?.filter((p: any) => p.status === 'active').length ?? 0,
        totalCustomers: custCount ?? 0,
        monthlyRevenue: revenue,
        tasksCompleted: tasks?.filter((t: any) => t.status === 'done').length ?? 0,
        tasksPending: tasks?.filter((t: any) => t.status === 'todo' || t.status === 'in_progress').length ?? 0,
        tasksBlocked: tasks?.filter((t: any) => t.status === 'blocked').length ?? 0,
        projectsByStatus,
      });
      setRecentProjects((projects || []).slice(0, 5) as Project[]);
      setRecentTasks((tasks || []).slice(0, 6) as Task[]);
      setLoading(false);
    }

    load();

    if (!supabase) return () => {};

    const channel = supabase

      .channel('financial-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_records',
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      planning: 'bg-blue-100 text-blue-700',
      on_hold: 'bg-amber-100 text-amber-700',
      completed: 'bg-gray-100 text-gray-600',
      cancelled: 'bg-red-100 text-red-600',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  const priorityColor = (p: string) => {
    const map: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-500',
      medium: 'text-amber-500',
      low: 'text-emerald-500',
    };
    return map[p] || 'text-gray-500';
  };

  const taskStatusColor = (s: string) => {
    const map: Record<string, string> = {
      done: 'bg-emerald-100 text-emerald-700',
      in_progress: 'bg-blue-100 text-blue-700',
      todo: 'bg-gray-100 text-gray-600',
      review: 'bg-amber-100 text-amber-700',
      blocked: 'bg-red-100 text-red-600',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  const pieData = Object.entries(stats.projectsByStatus).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle="Sybella Systems Ltd — Overview"
      />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Team Members', value: stats.totalTeam, icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+0%', positive: true },
            { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: 'bg-emerald-50 text-emerald-600', trend: '+2', positive: true },
            { label: 'Active Customers', value: stats.totalCustomers, icon: Building2, color: 'bg-amber-50 text-amber-600', trend: '+5%', positive: true },
            { label: 'Total Revenue', value: `$${(stats.monthlyRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: 'bg-teal-50 text-teal-600', trend: '+12%', positive: true },
          ].map(({ label, value, icon: Icon, color, trend, positive }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Task Status Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Completed Tasks', value: stats.tasksCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'In Progress / Pending', value: stats.tasksPending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Blocked Tasks', value: stats.tasksBlocked, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Revenue vs Expenses</h3>
                <p className="text-xs text-muted-foreground">Last 6 months</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Expenses</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(213,88%,40%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(213,88%,40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158,60%,40%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(158,60%,40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v / 1000}K`} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(213,88%,40%)" fill="url(#revenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(158,60%,40%)" fill="url(#expenses)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Projects by status */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground text-sm">Projects by Status</h3>
              <p className="text-xs text-muted-foreground">Current portfolio</p>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v.replace('_', ' ')}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No project data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Projects & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Projects */}
          <div className="bg-white rounded-xl border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Recent Projects</h3>
              <a href="/projects" className="text-xs text-primary hover:underline">View all</a>
            </div>
            <div className="divide-y divide-border">
              {recentProjects.length === 0 && !loading && (
                <div className="p-6 text-center text-sm text-muted-foreground">No projects yet</div>
              )}
              {recentProjects.map(project => (
                <div key={project.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-medium ${priorityColor(project.priority)}`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-foreground">{project.progress}%</p>
                    <div className="w-16 h-1 bg-muted rounded-full mt-1">
                      <div
                        className="h-1 bg-primary rounded-full"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="bg-white rounded-xl border border-border">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Recent Tasks</h3>
              <a href="/projects" className="text-xs text-primary hover:underline">View all</a>
            </div>
            <div className="divide-y divide-border">
              {recentTasks.length === 0 && !loading && (
                <div className="p-6 text-center text-sm text-muted-foreground">No tasks yet</div>
              )}
              {recentTasks.map(task => (
                <div key={task.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${taskStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company Info Bar */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">SS</span>
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Sybella Systems Ltd</p>
                <p className="text-xs text-muted-foreground">Software Company · Rulindo, Rwanda</p>
              </div>
            </div>
            <div className="h-8 w-px bg-border hidden sm:block" />
            <div className="flex flex-wrap gap-6 text-sm">
              {[
                { label: 'Founded', value: '2025' },
                { label: 'Industry', value: 'Software & Technology' },
                { label: 'Location', value: 'Rulindo, Rwanda' },
                { label: 'Team Size', value: '9 Members' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground text-xs mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600">All Systems Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}