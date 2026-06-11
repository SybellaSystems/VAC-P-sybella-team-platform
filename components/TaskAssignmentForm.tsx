'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import type { Profile, ExtendedTask } from '@/lib/database.types';
import { MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface TaskAssignmentFormProps {
  projectId: string;
  taskId?: string;
  onComplete?: (task: ExtendedTask) => void;
  onCancel?: () => void;
}

export function TaskAssignmentForm({ projectId, taskId, onComplete, onCancel }: TaskAssignmentFormProps) {
  const [step, setStep] = useState<'details' | 'assignment' | 'visibility'>('details');
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<Profile[]>([]);
  const [task, setTask] = useState<Partial<ExtendedTask>>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: null,
    assigned_to: null,
    status: 'todo',
    visible_in_chat: true,
    estimated_hours: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTeamMembers();
    if (taskId) {
      loadTask();
    }
  }, [taskId, projectId]);

  const loadTeamMembers = async () => {
    const { data: assignments } = await supabase!
      .from('project_assignments')

      .select('member_id')
      .eq('project_id', projectId);

    if (!assignments) return;

    const memberIds = assignments.map((a: any) => a.member_id);
    const { data: profiles } = await supabase!
      .from('profiles')

      .select('*')
      .in('id', memberIds);

    setTeam((profiles as Profile[]) || []);
  };

  const loadTask = async () => {
    if (!taskId) return;
    const { data } = await supabase!
      .from('tasks')

      .select('*')
      .eq('id', taskId)
      .single();

    if (data) {
      setTask(data);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Avoid sending non-column fields to Supabase (can cause silent failures).
      const payload = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        due_date: task.due_date,
        completed_at: task.completed_at,
        estimated_hours: task.estimated_hours,
        actual_hours: task.actual_hours,
        message_context: task.message_context,
        parent_task_id: (task as any).parent_task_id,
        visible_in_chat: task.visible_in_chat,
      };

      if (taskId) {
        const { error } = await supabase!
          .from('tasks')

          .update(payload)
          .eq('id', taskId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase!
          .from('tasks')

          .insert({
            ...payload,
            project_id: projectId,
            created_by: (task as any).created_by,
          })
          .select()
          .single();

        if (error) throw error;
        setTask(data);
      }

      toast({
        title: 'Success',
        description: taskId ? 'Task updated' : 'Task created',
      });

      onComplete?.(task as ExtendedTask);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save task',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'details') {
      setStep('assignment');
    } else if (step === 'assignment') {
      setStep('visibility');
    }
  };

  const handleBack = () => {
    if (step === 'assignment') {
      setStep('details');
    } else if (step === 'visibility') {
      setStep('assignment');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{taskId ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>
            Set up task details, assign team members, and configure visibility
          </DialogDescription>
        </DialogHeader>

        <Tabs value={step} onValueChange={(val) => setStep(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              Details
            </TabsTrigger>
            <TabsTrigger value="assignment">
              Assignment
            </TabsTrigger>
            <TabsTrigger value="visibility">
              Visibility
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">Task Title *</Label>
              <Input
                id="title"
                value={task.title || ''}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                placeholder="Enter task title"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={task.description || ''}
                onChange={(e) => setTask({ ...task, description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority" className="text-sm font-medium">Priority *</Label>
                <Select value={task.priority || 'medium'} onValueChange={(val) => setTask({ ...task, priority: val as any })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
                <Select value={task.status || 'todo'} onValueChange={(val) => setTask({ ...task, status: val as any })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="started">Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dueDate" className="text-sm font-medium">Due Date</Label>
                  <Input
                  id="dueDate"
                  type="date"
                  value={typeof task.due_date === 'string' ? task.due_date : ''}
                  onChange={(e) => setTask({ ...task, due_date: e.target.value ? e.target.value : null })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="estimatedHours" className="text-sm font-medium">Est. Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  value={task.estimated_hours || ''}
                  onChange={(e) => setTask({ ...task, estimated_hours: parseFloat(e.target.value) })}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="mt-1"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assign Team Member</CardTitle>
                <CardDescription>Select who will work on this task</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={task.assigned_to || ''} onValueChange={(val) => setTask({ ...task, assigned_to: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {team.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Task Context</CardTitle>
                <CardDescription>Add context or requirements for this task</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={task.message_context || ''}
                  onChange={(e) => setTask({ ...task, message_context: e.target.value })}
                  placeholder="Enter any additional context, requirements, or notes..."
                  rows={4}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actual Hours</CardTitle>
                <CardDescription>Track time spent on this task</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  value={task.actual_hours || ''}
                  onChange={(e) => setTask({ ...task, actual_hours: parseFloat(e.target.value) })}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visibility" className="space-y-4 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat Visibility
                </CardTitle>
                <CardDescription>
                  Control if this task appears in team messages and chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="visibleInChat"
                    checked={task.visible_in_chat ?? true}
                    onCheckedChange={(checked) => setTask({ ...task, visible_in_chat: checked as boolean })}
                  />
                  <Label htmlFor="visibleInChat" className="font-medium cursor-pointer">
                    Make this task visible in chat
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  When enabled, team members can see this task in the project channel and discuss it directly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Task notifications will be sent to assigned members
                </CardDescription>
              </CardHeader>
              <CardContent>
                {task.assigned_to && team.find(m => m.id === task.assigned_to) ? (
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        {team.find(m => m.id === task.assigned_to)?.full_name}
                      </p>
                      <p className="text-xs text-blue-800">
                        will be notified when this task is assigned
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Assign a team member to enable notifications
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Priority Warning</CardTitle>
                <CardDescription>Current task priority</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`p-3 rounded text-sm font-medium ${
                  task.priority === 'critical' ? 'bg-red-50 text-red-900' :
                  task.priority === 'high' ? 'bg-orange-50 text-orange-900' :
                  task.priority === 'medium' ? 'bg-yellow-50 text-yellow-900' :
                  'bg-green-50 text-green-900'
                }`}>
                  {task.priority?.charAt(0).toUpperCase() + (task.priority?.slice(1) || '')} Priority
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {step !== 'details' && (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          )}
          {step !== 'visibility' && (
            <Button onClick={handleNext}>Next</Button>
          )}
          {step === 'visibility' && (
            <Button onClick={handleSave} disabled={loading || !task.title}>
              {loading ? 'Saving...' : (taskId ? 'Update Task' : 'Create Task')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
