'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  getTaskStatistics, 
  calculateTaskCompletionRate, 
  calculateProjectHealthScore,
  getTeamPerformance,
  getTrendingMetrics,
  getProjectAnalytics
} from '@/lib/project-analytics';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';
import type { ProjectAnalytic } from '@/lib/database.types';

interface ProjectAnalyticsDashboardProps {
  projectId: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

export function ProjectAnalyticsDashboard({ projectId }: ProjectAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [completionRate, setCompletionRate] = useState(0);
  const [healthScore, setHealthScore] = useState(0);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<ProjectAnalytic[]>([]);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      const [stats, completion, health, team, analyt, trend] = await Promise.all([
        getTaskStatistics(projectId),
        calculateTaskCompletionRate(projectId),
        calculateProjectHealthScore(projectId),
        getTeamPerformance(projectId),
        getProjectAnalytics(projectId),
        getTrendingMetrics(projectId, 'tasks_completed'),
      ]);

      setTaskStats(stats);
      setCompletionRate(completion);
      setHealthScore(health);
      setTeamPerformance(team);
      setAnalytics(analyt);
      setTrends(trend);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const statusData = taskStats ? [
    { name: 'To Do', value: taskStats.byStatus['todo'] || 0 },
    { name: 'In Progress', value: taskStats.byStatus['in_progress'] || 0 },
    { name: 'In Review', value: taskStats.byStatus['review'] || 0 },
    { name: 'Completed', value: taskStats.byStatus['done'] || 0 },
  ] : [];

  const priorityData = taskStats ? [
    { name: 'Low', value: taskStats.byPriority['low'] || 0 },
    { name: 'Medium', value: taskStats.byPriority['medium'] || 0 },
    { name: 'High', value: taskStats.byPriority['high'] || 0 },
    { name: 'Critical', value: taskStats.byPriority['critical'] || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}</div>
            <Progress value={healthScore} className="mt-2" />
            <p className="text-xs text-gray-500 mt-2">Project overall health</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-gray-500 mt-2">Tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats?.total || 0}</div>
            <p className="text-xs text-gray-500 mt-4">
              {taskStats?.overdue || 0} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamPerformance.length}</div>
            <p className="text-xs text-gray-500 mt-4">
              {taskStats?.unassigned || 0} unassigned tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status">Task Status</TabsTrigger>
          <TabsTrigger value="priority">Priority</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
              <CardDescription>Number of tasks by status</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No task data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
              <CardDescription>Breakdown of task priorities</CardDescription>
            </CardHeader>
            <CardContent>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500 py-8">No priority data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Task completion rates by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance.map((member: any) => (
                  <div key={member.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.completion_rate}%</p>
                    </div>
                    <Progress value={member.completion_rate} />
                    <p className="text-xs text-gray-500">
                      {member.completed_tasks} of {member.total_tasks} completed
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion Trend</CardTitle>
              <CardDescription>Tasks completed over the past 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {trends && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {trends.trendDirection === 'up' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <span className={trends.trendDirection === 'up' ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(trends.trend)}% vs last week
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Current</p>
                      <p className="text-2xl font-bold">{Math.round(trends.current)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Previous</p>
                      <p className="text-2xl font-bold">{Math.round(trends.previous)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      {taskStats && taskStats.overdue > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-orange-900">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-900">
              {taskStats.overdue} task{taskStats.overdue !== 1 ? 's' : ''} {taskStats.overdue === 1 ? 'is' : 'are'} overdue. 
              Please prioritize these tasks to keep the project on track.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
