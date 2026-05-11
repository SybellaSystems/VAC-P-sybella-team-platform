'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, FolderKanban, DollarSign, TrendingUp, 
  CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, 
  Building2, Activity, ArrowUpRight, ArrowDownRight, 
  Calendar, Briefcase, ChevronRight, Search, Filter, Bell
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import type { Project, Task } from '@/lib/database.types';

// Definitions
// Stats: Object containing aggregated dashboard metrics.
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

const revenueData = [
  { month: 'Jan', revenue: 42000, expenses: 28000 },
  { month: 'Feb', revenue: 48000, expenses: 31000 },
  { month: 'Mar', revenue: 44000, expenses: 29000 },
  { month: 'Apr', revenue: 55000, expenses: 33000 },
  { month: 'May', revenue: 61000, expenses: 35000 },
  { month: 'Jun', revenue: 58000, expenses: 34000 },
];

const COLORS = ['hsl(213,88%,40%)', 'hsl(158,60%,40%)', 'hsl(35,82%,50%)', 'hsl(0,72%,51%)', 'hsl(215,15%,60%)'];

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTeam: 0, activeProjects: 0, totalCustomers: 0, monthlyRevenue: 0,
    tasksCompleted: 0, tasksPending: 0, tasksBlocked: 0, projectsByStatus: {},
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
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
          supabase.from('financial_records').select('amount,type').eq('type', 'income'),
        ]);

        const projectsByStatus: Record<string, number> = {};
        projects?.forEach(p => {
          projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
        });

        const revenue = finance?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) ?? 0;

        setStats({
          totalTeam: teamCount ?? 0,
          activeProjects: projects?.filter(p => p.status === 'active').length ?? 0,
          totalCustomers: custCount ?? 0,
          monthlyRevenue: revenue,
          tasksCompleted: tasks?.filter(t => t.status === 'done').length ?? 0,
          tasksPending: tasks?.filter(t => t.status === 'todo' || t.status === 'in_progress').length ?? 0,
          tasksBlocked: tasks?.filter(t => t.status === 'blocked').length ?? 0,
          projectsByStatus,
        });
        setRecentProjects((projects || []).slice(0, 5) as Project[]);
        setRecentTasks((tasks || []).slice(0, 6) as Task[]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
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
    <div className="min-h-screen bg-[#F9FAFB]">
      <TopBar
        title="Dashboard"
        subtitle="Sybella Systems Ltd — Overview"
      />
      
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Search and Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-border shadow-sm">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search projects, tasks, or members..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-border rounded-lg hover:bg-slate-50">
                <Filter size={16} /> Filters
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90">
                Generate Report
              </button>
           </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Team Members', value: stats.totalTeam, icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+0%', positive: true },
            { label: 'Active Projects', value: stats.activeProjects, icon: FolderKanban, color: 'bg-emerald-50 text-emerald-600', trend: '+2', positive: true },
            { label: 'Active Customers', value: stats.totalCustomers, icon: Building2, color: 'bg-amber-50 text-amber-600', trend: '+5%', positive: true },
            { label: 'Total Revenue', value: `$${(stats.monthlyRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: 'bg-teal-50 text-teal-600', trend: '+12%', positive: true },
          ].map(({ label, value, icon: Icon, color, trend, positive }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-xs font-semibold flex items-center gap-0.5 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                  {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{loading ? '...' : value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Task Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Completed Tasks', value: stats.tasksCompleted, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'In Progress / Pending', value: stats.tasksPending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Blocked Tasks', value: stats.tasksBlocked, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-4 shadow-sm">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{loading ? '0' : value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Revenue vs Expenses</h3>
                <p className="text-xs text-muted-foreground">Financial performance trends</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Expenses</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(213,88%,40%)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(213,88%,40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158,60%,40%)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(158,60%,40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, '']} 
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(213,88%,40%)" fill="url(#revenue)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(158,60%,40%)" fill="url(#expenses)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground text-sm mb-1">Projects by Status</h3>
            <p className="text-xs text-muted-foreground mb-6">Current breakdown</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={60} outerRadius={85} dataKey="value" paddingAngle={5}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle" 
                    formatter={(v) => <span className="text-xs capitalize text-slate-600">{v.replace('_', ' ')}</span>} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <FolderKanban size={24} />
                </div>
                <p className="text-sm text-muted-foreground">No project data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50 border-b border-border">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Recent Projects</h3>
              </div>
              <a href="/projects" className="text-xs font-medium text-primary flex items-center hover:underline">
                View all <ChevronRight size={14} />
              </a>
            </div>
            <div className="divide-y divide-border">
              {recentProjects.length === 0 && !loading && (
                <div className="p-12 text-center text-sm text-muted-foreground">No projects found.</div>
              )}
              {recentProjects.map(project => (
                <div key={project.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{project.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${priorityColor(project.priority)}`}>
                        <div className="w-1 h-1 rounded-full bg-current" /> {project.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs font-bold text-slate-700 mb-1">{project.progress}%</p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${project.progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tasks Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50/50 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Recent Tasks</h3>
              </div>
              <a href="/projects" className="text-xs font-medium text-primary flex items-center hover:underline">
                View all <ChevronRight size={14} />
              </a>
            </div>
            <div className="divide-y divide-border">
              {recentTasks.length === 0 && !loading && (
                <div className="p-12 text-center text-sm text-muted-foreground">No tasks assigned.</div>
              )}
              {recentTasks.map(task => (
                <div key={task.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                       <Clock size={12} />
                       <span className="text-[11px]">
                        {task.due_date ? `Due ${new Date(task.due_date).toLocaleDateString()}` : 'No deadline'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${taskStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Company Info Bar */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-white font-extrabold text-lg">SS</span>
              </div>
              <div>
                <p className="font-bold text-foreground text-base">Sybella Systems Ltd</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity size={12} className="text-emerald-500" />
                  <span>Software Company · Kigali, Rwanda</span>
                </div>
              </div>
            </div>
            <div className="h-10 w-px bg-border hidden lg:block" />
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              {[
                { label: 'Founded', value: '2020' },
                { label: 'Industry', value: 'Software & Technology' },
                { label: 'Team Size', value: `${stats.totalTeam} Members` },
                { label: 'Status', value: 'Operational', accent: 'text-emerald-600' },
              ].map(({ label, value, accent }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
                  <p className={`font-bold text-xs mt-0.5 ${accent || 'text-foreground'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}