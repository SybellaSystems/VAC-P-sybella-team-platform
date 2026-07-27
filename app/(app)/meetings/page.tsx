'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Video, MapPin, Users, Clock, CircleCheck as CheckCircle2, Circle, ListTodo, FileText, ChevronRight, CircleAlert as AlertCircle, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type MeetingType = 'standup' | 'review' | 'planning' | 'retrospective' | 'one_on_one' | 'client' | 'general';
type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type ActionItemPriority = 'low' | 'medium' | 'high' | 'urgent';
type ActionItemStatus = 'open' | 'in_progress' | 'done' | 'blocked';

interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  start_time: string;
  end_time: string;
  location: string | null;
  agenda: string | null;
  minutes: string | null;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  project?: { id: string; name: string } | null;
  creator?: { full_name: string } | null;
  attendees?: MeetingAttendee[];
  action_items?: MeetingActionItem[];
}

interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string;
  rsvp_status: string;
  profile?: { full_name: string; role: string } | null;
}

interface MeetingActionItem {
  id: string;
  meeting_id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  assignee?: { full_name: string } | null;
}

const meetingTypeConfig: Record<MeetingType, { label: string; badge: string }> = {
  standup: { label: 'Standup', badge: 'bg-blue-100 text-blue-800' },
  review: { label: 'Review', badge: 'bg-purple-100 text-purple-800' },
  planning: { label: 'Planning', badge: 'bg-emerald-100 text-emerald-800' },
  retrospective: { label: 'Retrospective', badge: 'bg-amber-100 text-amber-800' },
  one_on_one: { label: '1:1', badge: 'bg-pink-100 text-pink-800' },
  client: { label: 'Client', badge: 'bg-indigo-100 text-indigo-800' },
  general: { label: 'General', badge: 'bg-slate-100 text-slate-800' },
};

const statusConfig: Record<MeetingStatus, { label: string; badge: string; icon: typeof Clock }> = {
  scheduled: { label: 'Scheduled', badge: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: { label: 'In Progress', badge: 'bg-amber-100 text-amber-800', icon: Clock },
  completed: { label: 'Completed', badge: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', badge: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const priorityConfig: Record<ActionItemPriority, { badge: string }> = {
  low: { badge: 'bg-slate-100 text-slate-700' },
  medium: { badge: 'bg-blue-100 text-blue-700' },
  high: { badge: 'bg-amber-100 text-amber-700' },
  urgent: { badge: 'bg-red-100 text-red-700' },
};

const actionStatusConfig: Record<ActionItemStatus, { badge: string; icon: typeof Circle }> = {
  open: { badge: 'bg-slate-100 text-slate-700', icon: Circle },
  in_progress: { badge: 'bg-blue-100 text-blue-700', icon: Clock },
  done: { badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  blocked: { badge: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function MeetingsPage() {
  const { profile } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showActionItemDialog, setShowActionItemDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    title: '',
    type: 'general' as MeetingType,
    start_time: '',
    end_time: '',
    location: '',
    agenda: '',
    project_id: '',
  });

  const [newActionItem, setNewActionItem] = useState({
    title: '',
    assignee_id: '',
    due_date: '',
    priority: 'medium' as ActionItemPriority,
  });

  useEffect(() => {
    if (profile) {
      fetchMeetings();
      fetchProfiles();
      fetchProjects();
    }
  }, [profile]);

  async function fetchMeetings() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, project:projects!meetings_project_id_fkey(id,name), creator:profiles!meetings_created_by_fkey(full_name), attendees:meeting_attendees(*, profile:profiles!meeting_attendees_user_id_fkey(full_name,role)), action_items:meeting_action_items(*, assignee:profiles!meeting_action_items_assignee_id_fkey(full_name))')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setMeetings((data as Meeting[]) || []);
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
      setError(err?.message || 'Failed to load meetings');
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfiles() {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  }

  async function fetchProjects() {
    try {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }

  async function handleCreateMeeting() {
    if (!newMeeting.title.trim()) {
      toast.error('Meeting title is required');
      return;
    }
    if (!newMeeting.start_time) {
      toast.error('Start time is required');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('meetings').insert({
        title: newMeeting.title.trim(),
        type: newMeeting.type,
        status: 'scheduled',
        start_time: newMeeting.start_time,
        end_time: newMeeting.end_time || null,
        location: newMeeting.location.trim() || null,
        agenda: newMeeting.agenda.trim() || null,
        project_id: newMeeting.project_id || null,
        created_by: profile?.id || null,
      });
      if (error) throw error;
      toast.success('Meeting created');
      setShowCreateDialog(false);
      setNewMeeting({
        title: '',
        type: 'general',
        start_time: '',
        end_time: '',
        location: '',
        agenda: '',
        project_id: '',
      });
      fetchMeetings();
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      toast.error(err?.message || 'Failed to create meeting');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteMeeting(meetingId: string) {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', meetingId);
      if (error) throw error;
      toast.success('Meeting marked as completed');
      if (selectedMeeting?.id === meetingId) {
        setSelectedMeeting({ ...selectedMeeting, status: 'completed' });
      }
      fetchMeetings();
    } catch (err: any) {
      console.error('Error completing meeting:', err);
      toast.error('Failed to complete meeting');
    }
  }

  async function handleAddActionItem() {
    if (!selectedMeeting) return;
    if (!newActionItem.title.trim()) {
      toast.error('Action item title is required');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('meeting_action_items').insert({
        meeting_id: selectedMeeting.id,
        title: newActionItem.title.trim(),
        assignee_id: newActionItem.assignee_id || null,
        due_date: newActionItem.due_date || null,
        priority: newActionItem.priority,
        status: 'open',
      });
      if (error) throw error;
      toast.success('Action item added');
      setShowActionItemDialog(false);
      setNewActionItem({ title: '', assignee_id: '', due_date: '', priority: 'medium' });
      fetchMeetings();
      if (selectedMeeting) {
        const { data } = await supabase
          .from('meeting_action_items')
          .select('*, assignee:profiles!meeting_action_items_assignee_id_fkey(full_name)')
          .eq('meeting_id', selectedMeeting.id);
        setSelectedMeeting({ ...selectedMeeting, action_items: (data as MeetingActionItem[]) || [] });
      }
    } catch (err: any) {
      console.error('Error adding action item:', err);
      toast.error(err?.message || 'Failed to add action item');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateActionItemStatus(itemId: string, status: ActionItemStatus) {
    try {
      const { error } = await supabase
        .from('meeting_action_items')
        .update({ status })
        .eq('id', itemId);
      if (error) throw error;
      if (selectedMeeting) {
        setSelectedMeeting({
          ...selectedMeeting,
          action_items: selectedMeeting.action_items?.map((item) =>
            item.id === itemId ? { ...item, status } : item
          ),
        });
      }
      toast.success('Action item updated');
    } catch (err: any) {
      console.error('Error updating action item:', err);
      toast.error('Failed to update action item');
    }
  }

  async function handleDeleteActionItem(itemId: string) {
    try {
      const { error } = await supabase.from('meeting_action_items').delete().eq('id', itemId);
      if (error) throw error;
      if (selectedMeeting) {
        setSelectedMeeting({
          ...selectedMeeting,
          action_items: selectedMeeting.action_items?.filter((item) => item.id !== itemId),
        });
      }
      toast.success('Action item removed');
    } catch (err: any) {
      console.error('Error deleting action item:', err);
      toast.error('Failed to remove action item');
    }
  }

  const upcomingMeetings = useMemo(
    () => meetings.filter((m) => m.status === 'scheduled' || m.status === 'in_progress'),
    [meetings]
  );
  const pastMeetings = useMemo(
    () => meetings.filter((m) => m.status === 'completed' || m.status === 'cancelled'),
    [meetings]
  );
  const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const stats = useMemo(
    () => ({
      total: meetings.length,
      upcoming: upcomingMeetings.length,
      completed: meetings.filter((m) => m.status === 'completed').length,
      pendingActions: meetings.reduce(
        (sum, m) => sum + (m.action_items?.filter((a) => a.status !== 'done').length || 0),
        0
      ),
    }),
    [meetings, upcomingMeetings]
  );

  if (loading) {
    return (
      <div>
        <TopBar title="Meetings" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Meetings" subtitle="Schedule and manage meetings with action items" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meeting Management</h1>
            <p className="text-slate-600">Schedule and manage meetings with action items</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Meeting</DialogTitle>
                <DialogDescription>Schedule a new meeting with agenda and project link</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Meeting Title</Label>
                  <Input
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="e.g. Weekly Project Sync"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newMeeting.type}
                      onValueChange={(v: MeetingType) => setNewMeeting({ ...newMeeting, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standup">Standup</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="retrospective">Retrospective</SelectItem>
                        <SelectItem value="one_on_one">1:1</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project (Optional)</Label>
                    <Select
                      value={newMeeting.project_id}
                      onValueChange={(v) => setNewMeeting({ ...newMeeting, project_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.start_time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="datetime-local"
                      value={newMeeting.end_time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    placeholder="Room name, address, or video link"
                  />
                </div>
                <div>
                  <Label>Agenda</Label>
                  <Textarea
                    value={newMeeting.agenda}
                    onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                    placeholder="Meeting agenda items..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMeeting} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Meeting'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Total Meetings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.upcoming}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.completed}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <ListTodo className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.pendingActions}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Pending Actions</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock size={15} /> Upcoming ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle2 size={15} /> Past ({pastMeetings.length})
          </button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchMeetings} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Meeting List / Detail */}
        {!error && selectedMeeting ? (
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="text-sm text-blue-600 hover:underline mb-2 flex items-center gap-1"
                  >
                    ← Back to meetings
                  </button>
                  <h2 className="text-lg font-bold text-slate-900">{selectedMeeting.title}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className={meetingTypeConfig[selectedMeeting.type].badge}>
                      {meetingTypeConfig[selectedMeeting.type].label}
                    </Badge>
                    <Badge className={statusConfig[selectedMeeting.status].badge}>
                      {statusConfig[selectedMeeting.status].label}
                    </Badge>
                    {selectedMeeting.project?.name && (
                      <Badge className="bg-slate-100 text-slate-700">{selectedMeeting.project.name}</Badge>
                    )}
                  </div>
                </div>
                {selectedMeeting.status !== 'completed' && (
                  <Button size="sm" variant="outline" onClick={() => handleCompleteMeeting(selectedMeeting.id)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Complete
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>
                    {format(new Date(selectedMeeting.start_time), 'MMM d, yyyy h:mm a')}
                    {selectedMeeting.end_time && ` - ${format(new Date(selectedMeeting.end_time), 'h:mm a')}`}
                  </span>
                </div>
                {selectedMeeting.location && (
                  <div className="flex items-center gap-2 text-slate-600">
                    {selectedMeeting.location.includes('http') || selectedMeeting.location.includes('zoom') ? (
                      <Video className="h-4 w-4 text-slate-400" />
                    ) : (
                      <MapPin className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="truncate">{selectedMeeting.location}</span>
                  </div>
                )}
                {selectedMeeting.creator?.full_name && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{selectedMeeting.creator.full_name}</span>
                  </div>
                )}
              </div>

              {/* Agenda */}
              {selectedMeeting.agenda && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    Agenda
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedMeeting.agenda}
                  </div>
                </div>
              )}

              {/* Attendees */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Attendees ({selectedMeeting.attendees?.length || 0})
                </h3>
                {selectedMeeting.attendees && selectedMeeting.attendees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.attendees.map((att) => (
                      <Badge key={att.id} variant="outline" className="py-1.5 px-3">
                        {att.profile?.full_name || 'Unknown'}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No attendees added</p>
                )}
              </div>

              {/* Action Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4" />
                    Action Items ({selectedMeeting.action_items?.length || 0})
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowActionItemDialog(true)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Action
                  </Button>
                </div>
                {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeeting.action_items.map((item) => {
                      const pCfg = priorityConfig[item.priority];
                      const sCfg = actionStatusConfig[item.status];
                      const StatusIcon = sCfg.icon;
                      return (
                        <div key={item.id} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
                          <button
                            onClick={() =>
                              handleUpdateActionItemStatus(
                                item.id,
                                item.status === 'done' ? 'open' : 'done'
                              )
                            }
                            className="mt-0.5 flex-shrink-0"
                          >
                            <StatusIcon
                              className={`h-4 w-4 ${
                                item.status === 'done'
                                  ? 'text-emerald-600'
                                  : item.status === 'blocked'
                                  ? 'text-red-500'
                                  : 'text-slate-400'
                              }`}
                            />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                item.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'
                              }`}
                            >
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge className={pCfg.badge}>{item.priority}</Badge>
                              <Badge className={sCfg.badge}>{item.status.replace('_', ' ')}</Badge>
                              {item.assignee?.full_name && (
                                <span className="text-xs text-slate-500">· {item.assignee.full_name}</span>
                              )}
                              {item.due_date && (
                                <span className="text-xs text-slate-500">
                                  · Due {format(new Date(item.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteActionItem(item.id)}
                            className="text-slate-400 hover:text-red-500 flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No action items yet. Add one to track follow-ups.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : !error && displayMeetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No {activeTab} meetings</p>
              <p className="text-sm text-slate-400 mb-4">
                {activeTab === 'upcoming'
                  ? 'Schedule a new meeting to get started'
                  : 'Completed meetings will appear here'}
              </p>
              {activeTab === 'upcoming' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          !error && (
            <div className="space-y-3">
              {displayMeetings.map((meeting) => {
                const typeCfg = meetingTypeConfig[meeting.type];
                const sCfg = statusConfig[meeting.status];
                const pendingActions = meeting.action_items?.filter((a) => a.status !== 'done').length || 0;
                return (
                  <Card
                    key={meeting.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2.5 rounded-lg bg-slate-50 flex-shrink-0">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-sm truncate">{meeting.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {format(new Date(meeting.start_time), 'EEE, MMM d · h:mm a')}
                              {meeting.end_time && ` - ${format(new Date(meeting.end_time), 'h:mm a')}`}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={typeCfg.badge}>{typeCfg.label}</Badge>
                              <Badge className={sCfg.badge}>{sCfg.label}</Badge>
                              {meeting.location && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  {meeting.location.includes('http') ? (
                                    <Video className="h-3 w-3" />
                                  ) : (
                                    <MapPin className="h-3 w-3" />
                                  )}
                                  <span className="truncate max-w-[120px]">{meeting.location}</span>
                                </span>
                              )}
                              {pendingActions > 0 && (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                  <ListTodo className="h-3 w-3" />
                                  {pendingActions} pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Action Item Dialog */}
      <Dialog open={showActionItemDialog} onOpenChange={setShowActionItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
            <DialogDescription>Create a follow-up action for this meeting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action Item</Label>
              <Input
                value={newActionItem.title}
                onChange={(e) => setNewActionItem({ ...newActionItem, title: e.target.value })}
                placeholder="e.g. Send project proposal to client"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assignee</Label>
                <Select
                  value={newActionItem.assignee_id}
                  onValueChange={(v) => setNewActionItem({ ...newActionItem, assignee_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newActionItem.priority}
                  onValueChange={(v: ActionItemPriority) => setNewActionItem({ ...newActionItem, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={newActionItem.due_date}
                onChange={(e) => setNewActionItem({ ...newActionItem, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddActionItem} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Action Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
