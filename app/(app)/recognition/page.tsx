'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Heart,
  Plus,
  Award,
  Trophy,
  Megaphone,
  Filter,
  CircleAlert as AlertCircle,
  Sparkles,
  Medal,
  Star,
  Calendar,
  Clock,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInDays,
} from 'date-fns';

type RecognitionType = 'kudos' | 'award' | 'milestone' | 'shoutout';

interface EmployeeRecognition {
  id: string;
  given_by: string;
  recipient_id: string;
  recognition_type: RecognitionType;
  title?: string;
  description: string;
  created_at: string;
  from_profile?: { full_name: string } | null;
  to_profile?: { full_name: string } | null;
}

interface Profile {
  id: string;
  full_name: string;
}

const typeConfig: Record<
  RecognitionType,
  { label: string; icon: typeof Heart; color: string; badge: string; bg: string; border: string }
> = {
  kudos: { label: 'Kudos', icon: Heart, color: 'text-pink-600', badge: 'bg-pink-100 text-pink-700 border-pink-200', bg: 'bg-pink-50', border: 'border-pink-200' },
  award: { label: 'Award', icon: Award, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-200', bg: 'bg-amber-50', border: 'border-amber-200' },
  milestone: { label: 'Milestone', icon: Trophy, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700 border-purple-200', bg: 'bg-purple-50', border: 'border-purple-200' },
  shoutout: { label: 'Shoutout', icon: Megaphone, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-200', bg: 'bg-blue-50', border: 'border-blue-200' },
};

export default function RecognitionPage() {
  const { profile } = useAuth();
  const [recognitions, setRecognitions] = useState<EmployeeRecognition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [timeScope, setTimeScope] = useState<'this_week' | 'all'>('this_week');
  const [showDialog, setShowDialog] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newRecognition, setNewRecognition] = useState({
    recipient_id: '',
    type: 'kudos' as RecognitionType,
    description: '',
  });

  // Calculate weekly boundaries
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday end
  const daysRemainingInWeek = differenceInDays(weekEnd, now) + 1;

  useEffect(() => {
    if (profile) {
      fetchRecognitions();
      fetchProfiles();
    }
  }, [profile]);

  async function fetchRecognitions() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('employee_recognition')
        .select(`
          *,
          from_profile:profiles!employee_recognition_given_by_fkey(full_name),
          to_profile:profiles!employee_recognition_recipient_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const recs = (data as EmployeeRecognition[]) || [];
      setRecognitions(recs);

      // Check twice-a-week celebration display condition for logging in user
      checkTwiceWeeklyCelebration(recs);
    } catch (err: any) {
      console.error('Error fetching recognitions:', err);
      setError(err?.message || 'Failed to load recognition feed');
      toast.error('Failed to load recognition feed');
    } finally {
      setLoading(false);
    }
  }

  // Handles showing team celebrations popup twice per week per user
  function checkTwiceWeeklyCelebration(recs: EmployeeRecognition[]) {
    if (!profile?.id) return;

    const currentWeekKey = `celebration_week_${format(weekStart, 'yyyy-MM-dd')}_${profile.id}`;
    const storedCount = parseInt(localStorage.getItem(currentWeekKey) || '0', 10);

    const thisWeekRecs = recs.filter((r) =>
      isWithinInterval(new Date(r.created_at), { start: weekStart, end: weekEnd })
    );

    // If less than 2 views logged for this user this week & there are celebrations to show
    if (storedCount < 2 && thisWeekRecs.length > 0) {
      setShowCelebrationModal(true);
      localStorage.setItem(currentWeekKey, (storedCount + 1).toString());
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

  async function handleGiveRecognition() {
    if (!newRecognition.recipient_id) {
      toast.error('Please select a colleague');
      return;
    }
    if (!newRecognition.description.trim()) {
      toast.error('Please add a message');
      return;
    }
    if (newRecognition.recipient_id === profile?.id) {
      toast.error('You cannot give recognition to yourself');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('employee_recognition').insert({
        given_by: profile?.id,
        recipient_id: newRecognition.recipient_id,
        recognition_type: newRecognition.type,
        description: newRecognition.description.trim(),
      });

      if (error) throw error;

      const recipientName = profiles.find((p) => p.id === newRecognition.recipient_id)?.full_name || 'Colleague';
      const typeLabels: Record<string, string> = { kudos: 'Kudos', award: 'Award', milestone: 'Milestone', shoutout: 'Shoutout' };

      window.dispatchEvent(
        new CustomEvent('celebration', {
          detail: { message: `${typeLabels[newRecognition.type]} to ${recipientName}!` },
        })
      );

      toast.success('Recognition sent!');
      setShowDialog(false);
      setNewRecognition({ recipient_id: '', type: 'kudos', description: '' });
      fetchRecognitions();
    } catch (err: any) {
      console.error('Error creating recognition:', err);
      toast.error(err?.message || 'Failed to send recognition');
    } finally {
      setSubmitting(false);
    }
  }

  // Filter for recognitions belonging strictly to the current week
  const thisWeekRecognitions = useMemo(() => {
    return recognitions.filter((r) =>
      isWithinInterval(new Date(r.created_at), { start: weekStart, end: weekEnd })
    );
  }, [recognitions, weekStart, weekEnd]);

  // Combined filtering based on week scope & category filter
  const activeRecognitions = useMemo(() => {
    let list = timeScope === 'this_week' ? thisWeekRecognitions : recognitions;
    if (filterType !== 'all') {
      list = list.filter((r) => r.recognition_type === filterType);
    }
    return list;
  }, [timeScope, thisWeekRecognitions, recognitions, filterType]);

  const stats = useMemo(() => {
    const counts: Record<RecognitionType, number> = { kudos: 0, award: 0, milestone: 0, shoutout: 0 };
    activeRecognitions.forEach((r) => {
      if (counts[r.recognition_type] !== undefined) {
        counts[r.recognition_type] += 1;
      }
    });
    return { total: activeRecognitions.length, ...counts };
  }, [activeRecognitions]);

  const topRecognized = useMemo(() => {
    const countMap: Record<string, { name: string; count: number }> = {};
    activeRecognitions.forEach((r) => {
      const name = r.to_profile?.full_name || 'Unknown';
      if (!countMap[r.recipient_id]) {
        countMap[r.recipient_id] = { name, count: 0 };
      }
      countMap[r.recipient_id].count += 1;
    });
    return Object.entries(countMap)
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [activeRecognitions]);

  if (loading) {
    return (
      <div>
        <TopBar title="Weekly Recognition" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Recognition" subtitle="Celebrate and appreciate your colleagues" />

      {/* ================= TWICE A WEEK CELEBRATIONS POPUP DIALOG ================= */}
      <Dialog open={showCelebrationModal} onOpenChange={setShowCelebrationModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-center pb-2 border-b">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 flex items-center justify-center text-white mb-2 shadow-lg">
              <PartyPopper className="h-6 w-6 animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-slate-900">
              🎉 This Week's Team Celebrations!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Here are the honors and recognitions awarded across the team this week ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {thisWeekRecognitions.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No recognitions logged yet for this week.</p>
            ) : (
              thisWeekRecognitions.map((rec) => {
                const cfg = typeConfig[rec.recognition_type] || typeConfig.kudos;
                const Icon = cfg.icon;
                return (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} shadow-sm transition-all hover:scale-[1.01]`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white/80 shadow-xs flex-shrink-0`}>
                        <Icon className={`h-5 w-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${cfg.badge} border font-semibold`}>{cfg.label}</Badge>
                            <span className="text-xs text-slate-700">
                              <strong className="text-slate-900">{rec.from_profile?.full_name || 'Someone'}</strong>
                              {' → '}
                              <strong className="text-slate-900">{rec.to_profile?.full_name || 'Someone'}</strong>
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white/60 p-2.5 rounded-lg border border-slate-100">
                          "{rec.description}"
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="sm:justify-center border-t pt-3">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 px-6 font-bold" onClick={() => setShowCelebrationModal(false)}>
              Keep Celebrating ✨
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-4 sm:p-6 space-y-6">
        
        {/* ================= HEADER SPOTLIGHT BANNER (1 WEEK FEATURE) ================= */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 text-white p-6 shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 backdrop-blur-sm px-3 py-1 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 mr-1 inline" />
                  WEEKLY FEATURED HONOREES
                </Badge>
                <span className="text-xs text-indigo-200 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                This Week's Celebrations 🎉
              </h1>
              <p className="text-sm text-indigo-100/90 leading-relaxed">
                Every week we highlight colleagues who made an impact. All recognitions and colors set by the recognizer are highlighted across team dashboards!
              </p>

              <div className="pt-2 flex items-center gap-4 text-xs text-indigo-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-amber-300" />
                  {daysRemainingInWeek} {daysRemainingInWeek === 1 ? 'day' : 'days'} left in this weekly cycle
                </span>
                <span className="opacity-40">•</span>
                <span>{thisWeekRecognitions.length} recognitions awarded this week</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {thisWeekRecognitions.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCelebrationModal(true)} 
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold"
                >
                  <PartyPopper className="mr-2 h-4 w-4 text-amber-300" />
                  View Celebrations
                </Button>
              )}

              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
                    <Plus className="mr-2 h-5 w-5" />
                    Recognize Someone
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recognize a Colleague</DialogTitle>
                    <DialogDescription>Your recognition and styled category theme will be showcased across team login celebrations!</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Colleague</Label>
                      <Select
                        value={newRecognition.recipient_id}
                        onValueChange={(v) => setNewRecognition({ ...newRecognition, recipient_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a colleague" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles
                            .filter((p) => p.id !== profile?.id)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Recognition Type</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {(['kudos', 'award', 'milestone', 'shoutout'] as RecognitionType[]).map((type) => {
                          const cfg = typeConfig[type];
                          const Icon = cfg.icon;
                          const isSelected = newRecognition.type === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewRecognition({ ...newRecognition, type })}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? `border-blue-500 ${cfg.bg}`
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <Icon className={`h-5 w-5 ${isSelected ? cfg.color : 'text-slate-400'}`} />
                              <span className={`text-xs font-medium ${isSelected ? cfg.color : 'text-slate-500'}`}>
                                {cfg.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea
                        value={newRecognition.description}
                        onChange={(e) => setNewRecognition({ ...newRecognition, description: e.target.value })}
                        placeholder="Write a heartfelt message of appreciation..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleGiveRecognition} disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Recognition'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* ================= CONTROLS & TIME SCOPE TOGGLE ================= */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant={timeScope === 'this_week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeScope('this_week')}
              className="font-medium"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
              This Week ({thisWeekRecognitions.length})
            </Button>
            <Button
              variant={timeScope === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeScope('all')}
              className="font-medium"
            >
              All-Time History ({recognitions.length})
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-slate-400" />
            <Button
              variant={filterType === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            {(['kudos', 'award', 'milestone', 'shoutout'] as RecognitionType[]).map((type) => {
              const cfg = typeConfig[type];
              const Icon = cfg.icon;
              return (
                <Button
                  key={type}
                  variant={filterType === type ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterType(type)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  {cfg.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* ================= STATS FOR ACTIVE SCOPE ================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Heart className="h-5 w-5 text-pink-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.kudos}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Kudos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Award className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.award}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Awards</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Trophy className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.milestone}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Milestones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Megaphone className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.shoutout}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Shoutouts</p>
            </CardContent>
          </Card>
        </div>

        {/* ================= TOP RECOGNIZED ================= */}
        {topRecognized.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-amber-500" />
                  {timeScope === 'this_week' ? "This Week's Top Honorees" : 'All-Time Top Recognized'}
                </span>
                <span className="text-xs font-normal text-slate-400">
                  {timeScope === 'this_week' ? 'Weekly Leaderboard' : 'Overall Leaderboard'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {topRecognized.map((person, i) => {
                  const medals = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
                  return (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50/50"
                    >
                      <div className="flex items-center justify-center w-6">
                        {i < 3 ? (
                          <Medal className={`h-5 w-5 ${medals[i]}`} />
                        ) : (
                          <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                        )}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-700">
                          {person.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{person.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          {person.count} {person.count === 1 ? 'award' : 'awards'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchRecognitions} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ================= RECOGNITION FEED ================= */}
        {!error && activeRecognitions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium mb-1">
                {timeScope === 'this_week' ? 'No recognitions given yet this week' : 'No recognition entries found'}
              </p>
              <p className="text-sm text-slate-400 mb-4 text-center max-w-sm">
                {timeScope === 'this_week'
                  ? 'Be the first to give a shoutout to a teammate for this week!'
                  : 'Start recognizing colleagues to see them listed here.'}
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Recognize a Teammate
              </Button>
            </CardContent>
          </Card>
        ) : (
          !error && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-800">
                {timeScope === 'this_week' ? "This Week's Feed" : 'All Recognitions Feed'}
              </h2>
              {activeRecognitions.map((rec) => {
                const cfg = typeConfig[rec.recognition_type] || typeConfig.kudos;
                const Icon = cfg.icon;
                return (
                  <Card key={rec.id} className={`overflow-hidden hover:shadow-md transition-shadow border ${cfg.border} ${cfg.bg}`}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg bg-white/80 shadow-xs flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${cfg.badge} border font-semibold`}>{cfg.label}</Badge>
                              <span className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">
                                  {rec.from_profile?.full_name || 'Someone'}
                                </span>
                                {' → '}
                                <span className="font-semibold text-slate-900">
                                  {rec.to_profile?.full_name || 'Someone'}
                                </span>
                              </span>
                            </div>
                            <span className="text-xs text-slate-400" title={format(new Date(rec.created_at), 'PPp')}>
                              {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 mt-2 leading-relaxed bg-white/60 p-3 rounded-lg border border-slate-100">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}