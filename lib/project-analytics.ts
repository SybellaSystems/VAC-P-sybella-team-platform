import { supabase } from './supabase';
import type { ProjectAnalytic } from './database.types';

/**
 * Track a project metric
 */
export async function trackProjectMetric(
  projectId: string,
  metricName: string,
  value: number,
  dimension1?: string,
  dimension2?: string
): Promise<ProjectAnalytic> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('project_analytics')
    .upsert({
      project_id: projectId,
      metric_name: metricName,
      metric_value: value,
      metric_date: today,
      dimension_1: dimension1,
      dimension_2: dimension2,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get analytics for a project
 */
export async function getProjectAnalytics(
  projectId: string,
  metricName?: string,
  dateRange?: { from: string; to: string }
) {
  let query = supabase
    .from('project_analytics')
    .select('*')
    .eq('project_id', projectId);

  if (metricName) {
    query = query.eq('metric_name', metricName);
  }

  if (dateRange) {
    query = query
      .gte('metric_date', dateRange.from)
      .lte('metric_date', dateRange.to);
  }

  const { data, error } = await query.order('metric_date');
  if (error) throw error;
  return data || [];
}

/**
 * Calculate task completion rate for a project
 */
export async function calculateTaskCompletionRate(projectId: string): Promise<number> {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('project_id', projectId);

  if (!tasks || tasks.length === 0) return 0;

  const completed = tasks.filter(t => t.status === 'done').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Get task statistics for a project
 */
export async function getTaskStatistics(projectId: string) {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, priority, due_date, assigned_to')
    .eq('project_id', projectId);

  if (!tasks) return null;

  const stats = {
    total: tasks.length,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    overdue: 0,
    unassigned: 0,
  };

  tasks.forEach(task => {
    // Count by status
    stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;

    // Count by priority
    stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;

    // Count overdue
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      if (dueDate < new Date() && task.status !== 'done') {
        stats.overdue++;
      }
    }

    // Count unassigned
    if (!task.assigned_to) {
      stats.unassigned++;
    }
  });

  return stats;
}

/**
 * Get team performance metrics for a project
 */
export async function getTeamPerformance(projectId: string) {
  const { data: assignments } = await supabase
    .from('project_assignments')
    .select('member_id, role_in_project')
    .eq('project_id', projectId);

  if (!assignments) return [];

  const performance: Record<string, any> = {};

  for (const assignment of assignments) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('assigned_to', assignment.member_id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', assignment.member_id)
      .single();

    if (tasks && profile) {
      const completed = tasks.filter(t => t.status === 'done').length;
      performance[assignment.member_id] = {
        name: profile.full_name,
        email: profile.email,
        role: assignment.role_in_project,
        total_tasks: tasks.length,
        completed_tasks: completed,
        completion_rate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      };
    }
  }

  return Object.values(performance);
}

/**
 * Generate project health score (0-100)
 */
export async function calculateProjectHealthScore(projectId: string): Promise<number> {
  const { data: project } = await supabase
    .from('projects')
    .select('progress, status, budget, spent')
    .eq('id', projectId)
    .single();

  if (!project) return 0;

  const stats = await getTaskStatistics(projectId);
  if (!stats) return 0;

  let score = 50; // Base score

  // Progress factor (30 points)
  score += Math.min(30, (project.progress || 0) / 100 * 30);

  // Task completion factor (20 points)
  const completionRate = stats.total > 0 ? (stats.byStatus['done'] || 0) / stats.total : 0;
  score += Math.min(20, completionRate * 20);

  // Deadline factor (20 points)
  if (stats.overdue === 0) {
    score += 20;
  } else {
    const overdueRate = stats.overdue / stats.total;
    score += Math.max(0, 20 - (overdueRate * 20));
  }

  // Budget factor (10 points - bonus if under budget)
  if (project.spent <= project.budget) {
    score += 10;
  } else {
    const budgetOverrun = (project.spent - project.budget) / project.budget;
    score += Math.max(0, 10 - (budgetOverrun * 10));
  }

  // Status factor (10 points)
  if (project.status === 'active') {
    score += 10;
  } else if (project.status === 'on_hold' || project.status === 'planning') {
    score += 5;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Get project burndown data (tasks completed over time)
 */
export async function getProjectBurndown(projectId: string, days: number = 30) {
  const { data: analytics } = await supabase
    .from('project_analytics')
    .select('*')
    .eq('project_id', projectId)
    .eq('metric_name', 'tasks_completed')
    .gte('metric_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('metric_date');

  return analytics || [];
}

/**
 * Batch update analytics for a project
 */
export async function updateProjectAnalytics(
  projectId: string,
  metrics: Array<{ name: string; value: number; dimension1?: string; dimension2?: string }>
) {
  const today = new Date().toISOString().split('T')[0];
  
  const upsertData = metrics.map(m => ({
    project_id: projectId,
    metric_name: m.name,
    metric_value: m.value,
    metric_date: today,
    dimension_1: m.dimension1,
    dimension_2: m.dimension2,
  }));

  const { error } = await supabase
    .from('project_analytics')
    .upsert(upsertData);

  if (error) throw error;
}

/**
 * Get trending metrics (comparison with previous period)
 */
export async function getTrendingMetrics(projectId: string, metricName: string, days: number = 7) {
  const today = new Date();
  const currentPeriodStart = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000);

  const currentData = await getProjectAnalytics(projectId, metricName, {
    from: currentPeriodStart.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  });

  const previousData = await getProjectAnalytics(projectId, metricName, {
    from: previousPeriodStart.toISOString().split('T')[0],
    to: new Date(previousPeriodStart.getTime() + days * 24 * 60 * 60 * 1000 - 1).toISOString().split('T')[0],
  });

  const currentAvg = currentData.length > 0
    ? currentData.reduce((sum, d) => sum + d.metric_value, 0) / currentData.length
    : 0;

  const previousAvg = previousData.length > 0
    ? previousData.reduce((sum, d) => sum + d.metric_value, 0) / previousData.length
    : 0;

  return {
    current: currentAvg,
    previous: previousAvg,
    trend: previousAvg > 0 ? Math.round(((currentAvg - previousAvg) / previousAvg) * 100) : 0,
    trendDirection: currentAvg > previousAvg ? 'up' : 'down',
  };
}
