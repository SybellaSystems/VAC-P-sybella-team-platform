'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart
} from 'recharts';
import { Users, FolderKanban, CircleCheck as CheckCircle, DollarSign, TrendingUp, Activity, Clock, ClipboardList, Trophy, Award, Calendar, Target, LogIn, LogOut, ArrowUpRight, ArrowDownRight, Minus, BrainCircuit } from 'lucide-react';

const COLORS = ['hsl(213,88%,40%)', 'hsl(158,60%,40%)', 'hsl(35,82%,50%)', 'hsl(0,72%,51%)', 'hsl(195,75%,42%)', 'hsl(280,55%,52%)'];

type AnalyticsData = {
  projectStats: { name: string; value: number }[];
  taskStats: { name: string; value: number }[];
  roleDistribution: { role: string; count: number }[];
  reportTrend: { date: string; submitted: number; approved: number; flagged: number }[];
  financeSummary: { month: string; income: number; expense: number }[];
  checkinTrend: { date: string; checkins: number; checkouts: number }[];
  reportByType: { name: string; value: number }[];
  reportByRole: { role: string; count: number }[];
  recognitionStats: { type: string; count: number }[];
  topRecognized: { name: string; count: number }[];
  skillsDistribution: { level: string; count: number }[];
  meetingStats: { type: string; count: number }[];
  okrProgress: { level: string; avgProgress: number; count: number }[];
  teamActivity: { role: string; projects: number; tasks: number; reports: number; checkins: number }[];
  predictions: { metric: string; trend: 'up' | 'down' | 'stable'; change: number; forecast: string }[];
  summaryStats: {
    totalCheckIns: number;
    totalCheckOuts: number;
    todayCheckIns: number;
    todayCheckOuts: number;
    totalReports: number;
    totalRecognition: number;
    totalSkills: number;
    totalMeetings: number;
    totalObjectives: number;
    avgOkrProgress: number;
    reportCompletionRate: number;
    checkinRate: number;
  };
};

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    const today = new Date().toISOString().split('T')[0];
    const last14 = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    const [
      { data: projects },
      { data: tasks },
      { data: profiles },
      { data: reports },
      { data: finance },
      { data: checkIns },
      { data: checkOuts },
      { data: recognition },
      { data: skills },
      { data: meetings },
      { data: objectives },
      { data: keyResults },
      { data: assignments },
    ] = await Promise.all([
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('profiles').select('role, is_active, id, full_name, department'),
      supabase.from('accountability_reports').select('report_date, status, report_type, report_role, member_id'),
      supabase.from('financial_records').select('type, amount, date'),
      supabase.from('daily_check_ins').select('check_in_date, status, member_id'),
      supabase.from('daily_check_outs').select('check_out_date, status, member_id'),
      supabase.from('employee_recognition').select('recognition_type, recipient_id'),
      supabase.from('skills_matrix').select('proficiency, member_id, skill_name'),
      supabase.from('meetings').select('meeting_type, status, start_time'),
      supabase.from('objectives').select('id, level, progress, status'),
      supabase.from('key_results').select('current_value, target_value, start_value'),
      supabase.from('project_assignments').select('member_id, project_id'),
    ]);

    // Project by status
    const projectStatusMap: Record<string, number> = {};
    (projects || []).forEach((p: any) => {
      projectStatusMap[p.status] = (projectStatusMap[p.status] || 0) + 1;
    });
    const projectStats = Object.entries(projectStatusMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

    // Task by status
    const taskStatusMap: Record<string, number> = {};
    (tasks || []).forEach((t: any) => {
      taskStatusMap[t.status] = (taskStatusMap[t.status] || 0) + 1;
    });
    const taskStats = Object.entries(taskStatusMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

    // Role distribution
    const roleMap: Record<string, number> = {};
    (profiles || []).forEach((p: any) => {
      roleMap[p.role] = (roleMap[p.role] || 0) + 1;
    });
    const roleDistribution = Object.entries(roleMap).map(([role, count]) => ({ role, count }));

    // Report trend (last 14 days)
    const reportTrendMap: Record<string, { date: string; submitted: number; approved: number; flagged: number }> = {};
    last14.forEach(ds => {
      const d = new Date(ds);
      reportTrendMap[ds] = { date: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), submitted: 0, approved: 0, flagged: 0 };
    });
    (reports || []).forEach((r: any) => {
      if (reportTrendMap[r.report_date]) {
        if (r.status === 'submitted') reportTrendMap[r.report_date].submitted++;
        else if (r.status === 'approved') reportTrendMap[r.report_date].approved++;
        else if (r.status === 'flagged') reportTrendMap[r.report_date].flagged++;
      }
    });
    const reportTrend = last14.map(d => reportTrendMap[d]);

    // Report by type
    const reportTypeMap: Record<string, number> = {};
    (reports || []).forEach((r: any) => {
      const t = r.report_type || 'daily';
      reportTypeMap[t] = (reportTypeMap[t] || 0) + 1;
    });
    const reportByType = Object.entries(reportTypeMap).map(([name, value]) => ({ name, value }));

    // Report by role
    const reportRoleMap: Record<string, number> = {};
    (reports || []).forEach((r: any) => {
      const role = r.report_role || 'unknown';
      reportRoleMap[role] = (reportRoleMap[role] || 0) + 1;
    });
    const reportByRole = Object.entries(reportRoleMap).map(([role, count]) => ({ role, count }));

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

    // Check-in/out trend (last 14 days)
    const checkinTrendMap: Record<string, { date: string; checkins: number; checkouts: number }> = {};
    last14.forEach(ds => {
      const d = new Date(ds);
      checkinTrendMap[ds] = { date: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }), checkins: 0, checkouts: 0 };
    });
    (checkIns || []).forEach((c: any) => {
      if (checkinTrendMap[c.check_in_date] && c.status === 'submitted') checkinTrendMap[c.check_in_date].checkins++;
    });
    (checkOuts || []).forEach((c: any) => {
      if (checkinTrendMap[c.check_out_date] && c.status === 'submitted') checkinTrendMap[c.check_out_date].checkouts++;
    });
    const checkinTrend = last14.map(d => checkinTrendMap[d]);

    // Recognition stats
    const recognitionTypeMap: Record<string, number> = {};
    (recognition || []).forEach((r: any) => {
      const t = r.recognition_type || 'kudos';
      recognitionTypeMap[t] = (recognitionTypeMap[t] || 0) + 1;
    });
    const recognitionStats = Object.entries(recognitionTypeMap).map(([type, count]) => ({ type, count }));

    // Top recognized
    const recognizedMap: Record<string, number> = {};
    (recognition || []).forEach((r: any) => {
      recognizedMap[r.recipient_id] = (recognizedMap[r.recipient_id] || 0) + 1;
    });
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
    const topRecognized = Object.entries(recognizedMap)
      .map(([id, count]) => ({ name: profileMap[id] || 'Unknown', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Skills distribution
    const skillsLevelMap: Record<string, number> = {};
    (skills || []).forEach((s: any) => {
      skillsLevelMap[s.proficiency] = (skillsLevelMap[s.proficiency] || 0) + 1;
    });
    const levelOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const skillsDistribution = levelOrder
      .filter(l => skillsLevelMap[l])
      .map(level => ({ level, count: skillsLevelMap[level] || 0 }));

    // Meeting stats
    const meetingTypeMap: Record<string, number> = {};
    (meetings || []).forEach((m: any) => {
      const t = m.meeting_type || 'general';
      meetingTypeMap[t] = (meetingTypeMap[t] || 0) + 1;
    });
    const meetingStats = Object.entries(meetingTypeMap).map(([type, count]) => ({ type, count }));

    // OKR progress by level
    const okrLevelMap: Record<string, { total: number; sum: number; count: number }> = {};
    (objectives || []).forEach((o: any) => {
      const lvl = o.level || 'individual';
      if (!okrLevelMap[lvl]) okrLevelMap[lvl] = { total: 0, sum: 0, count: 0 };
      okrLevelMap[lvl].sum += o.progress || 0;
      okrLevelMap[lvl].count++;
    });
    const okrProgress = Object.entries(okrLevelMap).map(([level, v]) => ({
      level,
      avgProgress: v.count > 0 ? Math.round(v.sum / v.count) : 0,
      count: v.count,
    }));

    // Team activity (real data)
    const assignmentMap: Record<string, number> = {};
    (assignments || []).forEach((a: any) => {
      assignmentMap[a.member_id] = (assignmentMap[a.member_id] || 0) + 1;
    });
    const taskAssignmentMap: Record<string, number> = {};
    (tasks || []).forEach((t: any) => {
      if (t.assigned_to) taskAssignmentMap[t.assigned_to] = (taskAssignmentMap[t.assigned_to] || 0) + 1;
    });
    const reportMemberMap: Record<string, number> = {};
    (reports || []).forEach((r: any) => {
      reportMemberMap[r.member_id] = (reportMemberMap[r.member_id] || 0) + 1;
    });
    const checkinMemberMap: Record<string, number> = {};
    (checkIns || []).forEach((c: any) => {
      if (c.status === 'submitted') checkinMemberMap[c.member_id] = (checkinMemberMap[c.member_id] || 0) + 1;
    });

    const teamActivity = roleDistribution.map(r => {
      const membersOfRole = (profiles || []).filter((p: any) => p.role === r.role);
      const memberIds = membersOfRole.map((m: any) => m.id);
      const projects = memberIds.reduce((s: number, id: string) => s + (assignmentMap[id] || 0), 0);
      const tasksCount = memberIds.reduce((s: number, id: string) => s + (taskAssignmentMap[id] || 0), 0);
      const reportsCount = memberIds.reduce((s: number, id: string) => s + (reportMemberMap[id] || 0), 0);
      const checkinsCount = memberIds.reduce((s: number, id: string) => s + (checkinMemberMap[id] || 0), 0);
      return {
        role: r.role,
        projects: Math.round(projects / Math.max(1, membersOfRole.length)),
        tasks: Math.round(tasksCount / Math.max(1, membersOfRole.length)),
        reports: Math.round(reportsCount / Math.max(1, membersOfRole.length)),
        checkins: Math.round(checkinsCount / Math.max(1, membersOfRole.length)),
      };
    });

    // Summary stats
    const totalCheckIns = (checkIns || []).filter((c: any) => c.status === 'submitted').length;
    const totalCheckOuts = (checkOuts || []).filter((c: any) => c.status === 'submitted').length;
    const todayCheckIns = (checkIns || []).filter((c: any) => c.check_in_date === today && c.status === 'submitted').length;
    const todayCheckOuts = (checkOuts || []).filter((c: any) => c.check_out_date === today && c.status === 'submitted').length;
    const totalReports = (reports || []).length;
    const totalRecognition = (recognition || []).length;
    const totalSkills = (skills || []).length;
    const totalMeetings = (meetings || []).length;
    const totalObjectives = (objectives || []).length;
    const avgOkrProgress = okrProgress.length > 0
      ? Math.round(okrProgress.reduce((s, o) => s + o.avgProgress, 0) / okrProgress.length)
      : 0;
    const activeMembers = (profiles || []).filter((p: any) => p.is_active !== false).length;
    const checkinRate = activeMembers > 0 ? Math.round((todayCheckIns / activeMembers) * 100) : 0;
    const reportCompletionRate = totalReports > 0
      ? Math.round(((reports || []).filter((r: any) => r.status === 'approved').length / totalReports) * 100)
      : 0;

    // Predictions based on trends
    const last7Reports = reportTrend.slice(-7).reduce((s, d) => s + d.submitted + d.approved, 0);
    const prev7Reports = reportTrend.slice(0, 7).reduce((s, d) => s + d.submitted + d.approved, 0);
    const reportChange = prev7Reports > 0 ? Math.round(((last7Reports - prev7Reports) / prev7Reports) * 100) : 0;

    const last7Checkins = checkinTrend.slice(-7).reduce((s, d) => s + d.checkins, 0);
    const prev7Checkins = checkinTrend.slice(0, 7).reduce((s, d) => s + d.checkins, 0);
    const checkinChange = prev7Checkins > 0 ? Math.round(((last7Checkins - prev7Checkins) / prev7Checkins) * 100) : 0;

    const lastIncome = financeSummary.length > 0 ? financeSummary[financeSummary.length - 1].income : 0;
    const prevIncome = financeSummary.length > 1 ? financeSummary[financeSummary.length - 2].income : 0;
    const incomeChange = prevIncome > 0 ? Math.round(((lastIncome - prevIncome) / prevIncome) * 100) : 0;

    const predictions = [
      {
        metric: 'Report Submissions',
        trend: reportChange > 5 ? 'up' as const : reportChange < -5 ? 'down' as const : 'stable' as const,
        change: Math.abs(reportChange),
        forecast: reportChange > 5 ? 'Increasing engagement' : reportChange < -5 ? 'Declining - may need follow-up' : 'Stable reporting pattern',
      },
      {
        metric: 'Daily Check-Ins',
        trend: checkinChange > 5 ? 'up' as const : checkinChange < -5 ? 'down' as const : 'stable' as const,
        change: Math.abs(checkinChange),
        forecast: checkinChange > 5 ? 'Improving attendance' : checkinChange < -5 ? 'Drop in participation' : 'Consistent participation',
      },
      {
        metric: 'Revenue Outlook',
        trend: incomeChange > 5 ? 'up' as const : incomeChange < -5 ? 'down' as const : 'stable' as const,
        change: Math.abs(incomeChange),
        forecast: incomeChange > 5 ? 'Growth trajectory' : incomeChange < -5 ? 'Revenue contraction expected' : 'Stable revenue pattern',
      },
      {
        metric: 'OKR Progress',
        trend: avgOkrProgress > 60 ? 'up' as const : avgOkrProgress < 30 ? 'down' as const : 'stable' as const,
        change: avgOkrProgress,
        forecast: avgOkrProgress > 60 ? 'On track for completion' : avgOkrProgress < 30 ? 'Behind schedule - review needed' : 'Moderate progress',
      },
    ];

    setData({
      projectStats, taskStats, roleDistribution, reportTrend, financeSummary,
      checkinTrend, reportByType, reportByRole, recognitionStats, topRecognized,
      skillsDistribution, meetingStats, okrProgress, teamActivity, predictions,
      summaryStats: {
        totalCheckIns, totalCheckOuts, todayCheckIns, todayCheckOuts,
        totalReports, totalRecognition, totalSkills, totalMeetings,
        totalObjectives, avgOkrProgress, reportCompletionRate, checkinRate,
      },
    });
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div>
        <TopBar title="Analytics" subtitle="Loading analytics..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  const s = data.summaryStats;
  const totalProjects = data.projectStats.reduce((sum, d) => sum + d.value, 0);
  const totalTasks = data.taskStats.reduce((sum, d) => sum + d.value, 0);
  const totalMembers = data.roleDistribution.reduce((sum, d) => sum + d.count, 0);
  const completedTasks = data.taskStats.find(d => d.name === 'done')?.value || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <TopBar title="Analytics" subtitle="Organization-wide insights and predictions" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Primary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Projects', value: totalProjects, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Tasks', value: totalTasks, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Team Members', value: totalMembers, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Task Completion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 sm:p-5">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Engagement KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Today's Check-Ins", value: s.todayCheckIns, sub: `${s.checkinRate}% of team`, icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: "Today's Check-Outs", value: s.todayCheckOuts, sub: `${s.totalCheckOuts} total`, icon: LogOut, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Reports', value: s.totalReports, sub: `${s.reportCompletionRate}% approved`, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Recognition Given', value: s.totalRecognition, sub: 'across team', icon: Trophy, color: 'text-pink-600', bg: 'bg-pink-50' },
          ].map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{label}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 ml-12">{sub}</p>
            </div>
          ))}
        </div>

        {/* Predictions */}
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit size={18} className="text-blue-600" />
            <h3 className="font-semibold text-foreground text-sm">Trend Predictions</h3>
            <span className="text-[10px] text-muted-foreground ml-auto">Based on last 14 days</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.predictions.map((p) => (
              <div key={p.metric} className="p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-semibold text-foreground">{p.metric}</p>
                  {p.trend === 'up' ? (
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  ) : p.trend === 'down' ? (
                    <ArrowDownRight size={14} className="text-red-600" />
                  ) : (
                    <Minus size={14} className="text-slate-400" />
                  )}
                </div>
                <p className="text-lg font-bold text-foreground">
                  {p.trend === 'up' ? '+' : p.trend === 'down' ? '-' : ''}{p.change}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{p.forecast}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Check-in/out trend */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Daily Check-In / Check-Out Trend (Last 14 Days)</h3>
          {data.checkinTrend.every(d => d.checkins === 0 && d.checkouts === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No check-in data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.checkinTrend}>
                <defs>
                  <linearGradient id="checkins" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(213,88%,40%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(213,88%,40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="checkouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(35,82%,50%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(35,82%,50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="checkins" stroke="hsl(213,88%,40%)" fill="url(#checkins)" strokeWidth={2} />
                <Area type="monotone" dataKey="checkouts" stroke="hsl(35,82%,50%)" fill="url(#checkouts)" strokeWidth={2} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Reports section: trend + by type */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-5 lg:col-span-2">
            <h3 className="font-semibold text-foreground text-sm mb-4">Accountability Report Trend (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.reportTrend}>
                <defs>
                  <linearGradient id="rSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(213,88%,40%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(213,88%,40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158,60%,40%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(158,60%,40%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="submitted" stroke="hsl(213,88%,40%)" fill="url(#rSubmitted)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" stroke="hsl(158,60%,40%)" fill="url(#rApproved)" strokeWidth={2} />
                <Area type="monotone" dataKey="flagged" stroke="hsl(0,72%,51%)" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Reports by Type</h3>
            {data.reportByType.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No reports yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.reportByType} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                    {data.reportByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row: Project + Task charts */}
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

        {/* Finance + Role distribution */}
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

        {/* Recognition + Skills + OKR row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Recognition by Type</h3>
            {data.recognitionStats.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No recognition yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.recognitionStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(330,75%,55%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Skills Proficiency Distribution</h3>
            {data.skillsDistribution.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No skills data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.skillsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="level" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(195,75%,42%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">OKR Progress by Level</h3>
            {data.okrProgress.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No objectives yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.okrProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis dataKey="level" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avgProgress" fill="hsl(158,60%,40%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top recognized + meetings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Top Recognized Employees</h3>
            {data.topRecognized.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No recognition yet</div>
            ) : (
              <div className="space-y-2">
                {data.topRecognized.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-amber-100' : i === 1 ? 'bg-slate-200' : i === 2 ? 'bg-orange-100' : 'bg-muted'}`}>
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground text-sm mb-4">Meetings by Type</h3>
            {data.meetingStats.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No meetings yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.meetingStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215,20%,92%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(280,55%,52%)" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Team activity table */}
        {data.teamActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Team Activity Summary</h3>
              <p className="text-xs text-muted-foreground">Average activity per person by role</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Role</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Projects</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Tasks</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Reports</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Check-Ins</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.teamActivity.map((row) => (
                    <tr key={row.role} className="hover:bg-muted/20">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-foreground capitalize">{row.role.replace('_', ' ')}</span>
                      </td>
                      {[
                        { val: row.projects, color: 'bg-blue-500', scale: 12 },
                        { val: row.tasks, color: 'bg-emerald-500', scale: 4 },
                        { val: row.reports, color: 'bg-amber-500', scale: 10 },
                        { val: row.checkins, color: 'bg-violet-500', scale: 5 },
                      ].map(({ val, color, scale }, i) => (
                        <td key={i} className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full">
                              <div className={`h-1.5 ${color} rounded-full`} style={{ width: `${Math.min(100, val * scale)}%` }} />
                            </div>
                            <span className="text-xs font-medium text-foreground">{val}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
