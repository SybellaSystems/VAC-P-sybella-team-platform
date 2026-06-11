import { supabase } from './supabase';
import type { TaskMessage, ExtendedTask } from './database.types';

/**
 * Create a message for a task that will be visible in chat
 */
export async function createTaskMessage(
  taskId: string,
  messageText: string,
  userId: string,
  channelId?: string
): Promise<TaskMessage> {
  const { data, error } = await supabase
    .from('task_messages')
    .insert({
      task_id: taskId,
      channel_id: channelId,
      message_text: messageText,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all messages for a task
 */
export async function getTaskMessages(taskId: string): Promise<TaskMessage[]> {
  const { data, error } = await supabase
    .from('task_messages')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Post task assignment notification to channel
 */
export async function postTaskAssignmentToChannel(
  task: ExtendedTask,
  channelId: string,
  assigneeName: string,
  userId: string
): Promise<void> {
  if (!task.visible_in_chat) return;

  const messageText = `📋 **New Task Assignment**
  
**Task:** ${task.title}
**Assigned to:** ${assigneeName}
**Priority:** ${task.priority?.toUpperCase()}
**Due Date:** ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
**Status:** ${task.status}

${task.description ? `**Description:** ${task.description}` : ''}

${task.message_context ? `**Context:** ${task.message_context}` : ''}`;

  await createTaskMessage(task.id, messageText, userId, channelId);
}

/**
 * Post task update notification to channel
 */
export async function postTaskUpdateToChannel(
  task: ExtendedTask,
  channelId: string,
  changes: Record<string, any>,
  userId: string
): Promise<void> {
  if (!task.visible_in_chat) return;

  let changesSummary = '';
  if (changes.status) changesSummary += `\n• Status changed to: **${changes.status}**`;
  if (changes.priority) changesSummary += `\n• Priority changed to: **${changes.priority}**`;
  if (changes.assigned_to) changesSummary += `\n• Reassigned to: **${changes.assigned_to}**`;
  if (changes.progress) changesSummary += `\n• Progress: **${changes.progress}%**`;

  const messageText = `🔄 **Task Updated**

**Task:** ${task.title}
${changesSummary}

**Updated by:** ${userId}
**Time:** ${new Date().toLocaleString()}`;

  await createTaskMessage(task.id, messageText, userId, channelId);
}

/**
 * Post task completion notification to channel
 */
export async function postTaskCompletionToChannel(
  task: ExtendedTask,
  channelId: string,
  userId: string,
  hoursSpent?: number,
  feedback?: string
): Promise<void> {
  if (!task.visible_in_chat) return;

  const messageText = `✅ **Task Completed**

**Task:** ${task.title}
**Completed by:** ${userId}
**Time:** ${new Date().toLocaleString()}
${hoursSpent ? `\n**Hours Spent:** ${hoursSpent}` : ''}
${feedback ? `\n**Feedback:** ${feedback}` : ''}`;

  await createTaskMessage(task.id, messageText, userId, channelId);
}

/**
 * Get task summary for display in chat context
 */
export async function getTaskSummaryForChat(taskId: string) {
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) return null;

  const { data: assignee } = task.assigned_to
    ? await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', task.assigned_to)
        .single()
    : { data: null };

  const messages = await getTaskMessages(taskId);

  return {
    task: {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      assigned_to: assignee?.full_name || 'Unassigned',
    },
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1] || null,
  };
}

/**
 * Link task to a channel for notifications
 */
export async function linkTaskToChannel(
  taskId: string,
  channelId: string
): Promise<void> {
  // Update task with channel ID
  const { error } = await supabase
    .from('tasks')
    .update({ message_context: channelId })
    .eq('id', taskId);

  if (error) throw error;
}

/**
 * Get all tasks linked to a channel
 */
export async function getChannelTasks(channelId: string): Promise<ExtendedTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('message_context', channelId)
    .eq('visible_in_chat', true);

  if (error) throw error;
  return data || [];
}

/**
 * Create a task directly from a chat message
 */
export async function createTaskFromChatMessage(
  messageContent: string,
  projectId: string,
  channelId: string,
  userId: string,
  assignedTo?: string
): Promise<ExtendedTask> {
  // Extract task title from message (first line or first 50 chars)
  const title = messageContent.split('\n')[0].substring(0, 100);

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      title,
      description: messageContent,
      status: 'todo',
      priority: 'medium',
      assigned_to: assignedTo || null,
      created_by: userId,
      visible_in_chat: true,
      message_context: channelId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Generate task reminder message
 */
export function generateTaskReminderMessage(task: ExtendedTask): string {
  const daysUntilDue = task.due_date
    ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let urgency = '';
  if (daysUntilDue === 1) urgency = '⚠️ DUE TOMORROW!';
  else if (daysUntilDue === 0) urgency = '🔴 DUE TODAY!';
  else if (daysUntilDue && daysUntilDue < 0) urgency = '❌ OVERDUE!';
  else if (daysUntilDue && daysUntilDue <= 3) urgency = '⚡ DUE SOON';

  return `
📌 **Task Reminder**

**Task:** ${task.title}
**Priority:** ${task.priority?.toUpperCase()}
**Status:** ${task.status}
${urgency ? `**Alert:** ${urgency}` : ''}
${daysUntilDue ? `**Days until due:** ${daysUntilDue}` : ''}

${task.description ? `\n${task.description}` : ''}
  `.trim();
}

/**
 * Format task for inline chat mention
 */
export function formatTaskForChatMention(task: ExtendedTask): string {
  const priorityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢',
  };

  const emoji = priorityEmoji[task.priority as keyof typeof priorityEmoji] || '📋';

  return `${emoji} [${task.title}](task:${task.id})`;
}

/**
 * Check if task has unread messages
 */
export async function hasUnreadTaskMessages(
  taskId: string,
  userId: string,
  lastReadTime: Date
): Promise<boolean> {
  const { data, error } = await supabase
    .from('task_messages')
    .select('id')
    .eq('task_id', taskId)
    .gt('created_at', lastReadTime.toISOString())
    .neq('created_by', userId)
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

/**
 * Get task message thread (grouped by topic)
 */
export async function getTaskMessageThread(taskId: string): Promise<{
  topic: string;
  messages: TaskMessage[];
}[]> {
  const messages = await getTaskMessages(taskId);

  // Group messages by hour (simple grouping for threads)
  const threads: Record<string, TaskMessage[]> = {};

  messages.forEach((msg) => {
    const hour = new Date(msg.created_at).toISOString().split('T')[0];
    if (!threads[hour]) threads[hour] = [];
    threads[hour].push(msg);
  });

  return Object.entries(threads).map(([topic, msgs]) => ({
    topic,
    messages: msgs,
  }));
}
