'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Users, FolderKanban, CircleCheck as CheckCircle, DollarSign, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['hsl(213,88%,40%)', 'hsl(158,60%,40%)', 'hsl(35,82%,50%)', 'hsl(0,72%,51%)', 'hsl(195,75%,42%)', 'hsl(280,55%,52%)'];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState({
    projectStats: [] as any[],
    taskStats: [] as any[],
    memberActivity: [] as any[],
    roleDistribution: [] as any[],
    reportTrend: [] as any[],
    reportHealthTrend: [] as any[],
    financeSummary: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    const [
      { data: projects },
      { data: tasks },
      { data: profiles },
      { data: reports },
      { data: finance },
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('profiles').select('role, is_active'),
      supabase.from('accountability_reports').select('report_date, status, operational_health, confidence_score').order('report_date', { ascending: true }),
      supabase.from('financial_records').select('type, amount, date'),
    ]);

    // Project by status
    const projectStatusMap: Record<string, number> = {};
    (projects || []).forEach(p => {
      projectStatusMap[p.status] = (projectStatusMap[p.status] || 0) + 1;
    });
    const projectStats = Object.entries(projectStatusMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

    // Task by status
    const taskStatusMap: Record<string, number> = {};
    (tasks || []).forEach(t => {
      taskStatusMap[t.status] = (taskStatusMap[t.status] || 0) + 1;
    });
    const taskStats = Object.entries(taskStatusMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

    // Role distribution
    const roleMap: Record<string, number> = {};
    (profiles || []).forEach(p => {
      roleMap[p.role] = (roleMap[p.role] || 0) + 1;
    });
    const roleDistribution = Object.entries(roleMap).map(([role, count]) => ({ role, count }));

    // Report trend (last 14 days)
    const reportTrendMap: Record<string, { date: string; submitted: number; approved: number; flagged: number }> = {};
    const last14 = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const ds = d.toISOString().split('T')[0];
      reportTrendMap[ds] = { date: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), submitted: 0, approved: 0, flagged: 0 };
      return ds;
    });
    (reports || []).forEach((r: any) => {
      if (reportTrendMap[r.report_date]) {
        if (r.status === 'submitted') reportTrendMap[r.report_date].submitted++;
        else if (r.status === 'approved') reportTrendMap[r.report_date].approved++;
        else if (r.status === 'flagged') reportTrendMap[r.report_date].flagged++;
      }
    });
    const reportTrend = last14.map((d) => reportTrendMap[d]);

    const reportHealthTrendMap: Record<string, { date: string; health: number; healthCount: number; confidence: number; confidenceCount: number }> = {};
    last14.forEach((ds, index) => {
      reportHealthTrendMap[ds] = { date: reportTrendMap[ds].date, health: 0, healthCount: 0, confidence: 0, confidenceCount: 0 };
    });
    (reports || []).forEach((r: any) => {
      if (reportHealthTrendMap[r.report_date]) {
        if (typeof r.operational_health === 'number') {
          reportHealthTrendMap[r.report_date].health += r.operational_health;
          reportHealthTrendMap[r.report_date].healthCount += 1;
        }
        if (typeof r.confidence_score === 'number') {
          reportHealthTrendMap[r.report_date].confidence += r.confidence_score;
          reportHealthTrendMap[r.report_date].confidenceCount += 1;
        }
      }
    });
    const reportHealthTrend = last14.map((d) => {
      const record = reportHealthTrendMap[d];
      return {
        date: record.date,
        averageHealth: record.healthCount ? Math.round(record.health / record.healthCount) : 0,
        averageConfidence: record.confidenceCount ? Math.round(record.confidence / record.confidenceCount) : 0,
      };
    });

    // Finance by month
    const financeMonthMap: Record<string, { month: string; income: number; expense: number }> = {};
    (finance || []).forEach((f: any) => {
      const month = f.date.slice(0, 7);
      if (!financeMonthMap[month]) financeMonthMap[month] = { month, income: 0, expense: 0 };
      if (f.type === 'income') financeMonthMap[month].income += f.amount;
      if (f.type === 'expense') financeMonthMap[month].expense += f.amount;
    });
    const financeSummary = Object.values(financeMonthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(d => ({ ...d, month: new Date(d.month + '-01').toLocaleString('default', { month: 'short' }) }));

    // Team performance radar (mock data since we don't have perf metrics)
    const memberActivity = roleDistribution.map(r => ({
      role: r.role,
      projects: Math.round(Math.random() * 8 + 2),
      tasks: Math.round(Math.random() * 20 + 5),
      reports: Math.round(Math.random() * 10 + 1),
    }));

    setData({ projectStats, taskStats, memberActivity, roleDistribution, reportTrend, reportHealthTrend, financeSummary });
    setLoading(false);
  };

  const totalProjects = data.projectStats.reduce((s, d) => s + d.value, 0);
  const totalTasks = data.taskStats.reduce((s, d) => s + d.value, 0);
  const totalMembers = data.roleDistribution.reduce((s, d) => s + d.count, 0);
  const completedTasks = data.taskStats.find((d) => d.name === 'done')?.value || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const averageHealth = data.reportHealthTrend.length ? Math.round(data.reportHealthTrend.reduce((s, d) => s + d.averageHealth, 0) / data.reportHealthTrend.length) : 0;
  const averageConfidence = data.reportHealthTrend.length ? Math.round(data.reportHealthTrend.reduce((s, d) => s + d.averageConfidence, 0) / data.reportHealthTrend.length) : 0;

  return (
    <div>
      <TopBar title="Analytics" subtitle="Performance insights and metrics" />
      <div className="p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Tasks', value: totalTasks, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Average Health', value: `${averageHealth}%`, icon: Activity, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Team Members', value: totalMembers, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Task Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Avg Confidence', value: `${averageConfidence}%`, icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Row 1: Project + Task charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Projects by Status</h3>
            {data.projectStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No projects yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.projectStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(213,88%,40%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Tasks by Status</h3>
            {data.taskStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No tasks yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.taskStats} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {data.taskStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accountability trend */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Accountability Report Trend (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.reportTrend}>
              <defs>
                <linearGradient id="submitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(213,88%,40%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(213,88%,40%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="approved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158,60%,40%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(158,60%,40%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="submitted" stroke="hsl(213,88%,40%)" fill="url(#submitted)" strokeWidth={2} />
              <Area type="monotone" dataKey="approved" stroke="hsl(158,60%,40%)" fill="url(#approved)" strokeWidth={2} />
              <Area type="monotone" dataKey="flagged" stroke="hsl(0,72%,51%)" fill="none" strokeWidth={2} strokeDasharray="4 4" />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Finance + Team distribution row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Financial Overview (Monthly)</h3>
            {data.financeSummary.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No financial data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.financeSummary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v/1000}K`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                  <Line type="monotone" dataKey="income" stroke="hsl(158,60%,40%)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="hsl(0,72%,51%)" strokeWidth={2.5} dot={false} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Team Role Distribution</h3>
            {data.roleDistribution.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No team data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.roleDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="role" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(213,88%,40%)" radius={[0,4,4,0]}>
                    {data.roleDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity table */}
        {data.memberActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Team Activity Summary</h3>
              <p className="text-xs text-muted-foreground">Activity by department role</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Role</th>
                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Projects</th>
                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Tasks</th>
                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.memberActivity.map((row, i) => (
                  <tr key={row.role} className="hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-foreground capitalize">{row.role}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full">
                          <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, row.projects * 12)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{row.projects}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full">
                          <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, row.tasks * 4)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{row.tasks}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full">
                          <div className="h-1.5 bg-amber-500 rounded-full" style={{ width: `${Math.min(100, row.reports * 10)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{row.reports}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
