'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  Clock,
  Building2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Briefcase,
  ChevronRight,
  Search,
  Filter,
  Bell,
  RefreshCcw,
  Loader2,
  UserPlus,
  ListTodo,
  Wallet,
  BarChart3,
} from 'lucide-react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalTeam: number;
  activeProjects: number;
  totalCustomers: number;
  totalRevenue: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksBlocked: number;
  projectsByStatus: Record<string, number>;
  projectsCompleted: number;
  pendingInvoices: number;
}

interface Project {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  created_at: string;
  budget?: number;
  deadline?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to?: string;
  priority?: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  is_active: boolean;
}

interface Customer {
  id: string;
  company_name: string;
  status: string;
}

interface FinancialRecord {
  id: string;
  amount: number;
  type: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  actor_name?: string;
}

const COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

const initialStats: DashboardStats = {
  totalTeam: 0,
  activeProjects: 0,
  totalCustomers: 0,
  totalRevenue: 0,
  tasksCompleted: 0,
  tasksPending: 0,
  tasksBlocked: 0,
  projectsByStatus: {},
  projectsCompleted: 0,
  pendingInvoices: 0,
};

export default function DashboardPage() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState<DashboardStats>(initialStats);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);

      const [
        profilesResponse,
        projectsResponse,
        tasksResponse,
        customersResponse,
        financeResponse,
        activityResponse,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('is_active', true),

        supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('financial_records')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (profilesResponse.error) throw profilesResponse.error;
      if (projectsResponse.error) throw projectsResponse.error;
      if (tasksResponse.error) throw tasksResponse.error;
      if (customersResponse.error) throw customersResponse.error;
      if (financeResponse.error) throw financeResponse.error;
      if (activityResponse.error) throw activityResponse.error;

      const team = (profilesResponse.data || []) as TeamMember[];
      const projectList = (projectsResponse.data || []) as Project[];
      const taskList = (tasksResponse.data || []) as Task[];
      const customerList = (customersResponse.data || []) as Customer[];
      const financeList = (financeResponse.data || []) as FinancialRecord[];
      const activityList = (activityResponse.data || []) as ActivityLog[];

      setTeamMembers(team);
      setProjects(projectList);
      setTasks(taskList);
      setCustomers(customerList);
      setFinancialRecords(financeList);
      setActivities(activityList);

      const projectsByStatus: Record<string, number> = {};

      projectList.forEach((project) => {
        const key = project.status || 'unknown';
        projectsByStatus[key] = (projectsByStatus[key] || 0) + 1;
      });

      const totalRevenue = financeList
        .filter((record) => record.type === 'income')
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const pendingInvoices = financeList.filter(
        (record) => record.type === 'pending_invoice'
      ).length;

      setStats({
        totalTeam: team.length,
        activeProjects: projectList.filter((p) => p.status === 'active').length,
        totalCustomers: customerList.filter((c) => c.status === 'active').length,
        totalRevenue,
        tasksCompleted: taskList.filter((t) => t.status === 'done').length,
        tasksPending: taskList.filter(
          (t) => t.status === 'todo' || t.status === 'in_progress'
        ).length,
        tasksBlocked: taskList.filter((t) => t.status === 'blocked').length,
        projectsByStatus,
        projectsCompleted: projectList.filter(
          (p) => p.status === 'completed'
        ).length,
        pendingInvoices,
      });
    } catch (error) {
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const projectChannel = supabase
      .channel('dashboard-projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    const taskChannel = supabase
      .channel('dashboard-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(taskChannel);
    };
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tasks, searchQuery]);

  const pieData = Object.entries(stats.projectsByStatus).map(
    ([name, value]) => ({
      name,
      value,
    })
  );

  const monthlyRevenueData = financialRecords
    .filter((record) => record.type === 'income')
    .slice(0, 6)
    .reverse()
    .map((record) => ({
      month: new Date(record.created_at).toLocaleString('default', {
        month: 'short',
      }),
      revenue: Number(record.amount || 0),
      expenses: Math.round(Number(record.amount || 0) * 0.55),
    }));

  const taskChartData = [
    {
      name: 'Completed',
      value: stats.tasksCompleted,
    },
    {
      name: 'Pending',
      value: stats.tasksPending,
    },
    {
      name: 'Blocked',
      value: stats.tasksBlocked,
    },
  ];

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      planning: 'bg-blue-100 text-blue-700 border-blue-200',
      on_hold: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-slate-100 text-slate-700 border-slate-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      todo: 'bg-slate-100 text-slate-700 border-slate-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      blocked: 'bg-red-100 text-red-700 border-red-200',
      review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };

    return colors[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const priorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-emerald-600',
    };

    return colors[priority] || 'text-slate-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />

          <p className="text-sm text-slate-500 font-medium">
            Loading enterprise dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        title="Enterprise Dashboard"
        subtitle={`Welcome back ${profile?.full_name || 'Administrator'}`}
      />

      <div className="max-w-[1700px] mx-auto p-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full xl:max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects, tasks, customers or team members"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button className="h-11 px-4 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm font-medium">
                <Filter size={16} />
                Filters
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                className="h-11 px-4 rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-slate-50 text-sm font-medium"
              >
                <RefreshCcw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
                Refresh
              </button>

              <button className="relative h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50">
                <Bell size={18} />

                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          {[
            {
              title: 'Team Members',
              value: stats.totalTeam,
              icon: Users,
              color: 'bg-blue-50 text-blue-600',
              growth: '+12%',
              positive: true,
            },
            {
              title: 'Active Projects',
              value: stats.activeProjects,
              icon: FolderKanban,
              color: 'bg-emerald-50 text-emerald-600',
              growth: '+8%',
              positive: true,
            },
            {
              title: 'Customers',
              value: stats.totalCustomers,
              icon: Building2,
              color: 'bg-orange-50 text-orange-600',
              growth: '+4%',
              positive: true,
            },
            {
              title: 'Revenue',
              value: `$${stats.totalRevenue.toLocaleString()}`,
              icon: DollarSign,
              color: 'bg-violet-50 text-violet-600',
              growth: '+22%',
              positive: true,
            },
            {
              title: 'Completed Projects',
              value: stats.projectsCompleted,
              icon: TrendingUp,
              color: 'bg-teal-50 text-teal-600',
              growth: '+15%',
              positive: true,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}
                  >
                    <Icon size={22} />
                  </div>

                  <div
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      item.positive ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {item.positive ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}

                    {item.growth}
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 mb-1">
                  {item.value}
                </h2>

                <p className="text-sm text-slate-500">{item.title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}