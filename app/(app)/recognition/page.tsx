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
import { Heart, Plus, Award, Star, Trophy, Megaphone, Filter, TrendingUp, CircleAlert as AlertCircle, Sparkles, Medal } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

type RecognitionType = 'kudos' | 'award' | 'milestone' | 'shoutout';

interface EmployeeRecognition {
  id: string;
  from_user_id: string;
  to_user_id: string;
  type: RecognitionType;
  message: string;
  created_at: string;
  from_profile?: { full_name: string } | null;
  to_profile?: { full_name: string } | null;
}

interface Profile {
  id: string;
  full_name: string;
}

const typeConfig: Record<RecognitionType, { label: string; icon: typeof Heart; color: string; badge: string; bg: string }> = {
  kudos: { label: 'Kudos', icon: Heart, color: 'text-pink-600', badge: 'bg-pink-100 text-pink-700', bg: 'bg-pink-50' },
  award: { label: 'Award', icon: Award, color: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', bg: 'bg-amber-50' },
  milestone: { label: 'Milestone', icon: Trophy, color: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50' },
  shoutout: { label: 'Shoutout', icon: Megaphone, color: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', bg: 'bg-blue-50' },
};

export default function RecognitionPage() {
  const { profile } = useAuth();
  const [recognitions, setRecognitions] = useState<EmployeeRecognition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newRecognition, setNewRecognition] = useState({
    to_user_id: '',
    type: 'kudos' as RecognitionType,
    message: '',
  });

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
        .select('*, from_profile:profiles!employee_recognition_from_user_id_fkey(full_name), to_profile:profiles!employee_recognition_to_user_id_fkey(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecognitions((data as EmployeeRecognition[]) || []);
    } catch (err: any) {
      console.error('Error fetching recognitions:', err);
      setError(err?.message || 'Failed to load recognition feed');
      toast.error('Failed to load recognition feed');
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

  async function handleGiveRecognition() {
    if (!newRecognition.to_user_id) {
      toast.error('Please select a colleague');
      return;
    }
    if (!newRecognition.message.trim()) {
      toast.error('Please add a message');
      return;
    }
    if (newRecognition.to_user_id === profile?.id) {
      toast.error('You cannot give recognition to yourself');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('employee_recognition').insert({
        from_user_id: profile?.id,
        to_user_id: newRecognition.to_user_id,
        type: newRecognition.type,
        message: newRecognition.message.trim(),
      });
      if (error) throw error;
      const recipientName = profiles.find(p => p.id === newRecognition.to_user_id)?.full_name || 'Colleague';
      const typeLabels: Record<string, string> = { kudos: 'Kudos', award: 'Award', milestone: 'Milestone', shoutout: 'Shoutout' };
      window.dispatchEvent(new CustomEvent('celebration', {
        detail: { message: `${typeLabels[newRecognition.type]} to ${recipientName}!` }
      }));
      toast.success('Recognition sent!');
      setShowDialog(false);
      setNewRecognition({ to_user_id: '', type: 'kudos', message: '' });
      fetchRecognitions();
    } catch (err: any) {
      console.error('Error creating recognition:', err);
      toast.error(err?.message || 'Failed to send recognition');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRecognitions = useMemo(() => {
    if (filterType === 'all') return recognitions;
    return recognitions.filter((r) => r.type === filterType);
  }, [recognitions, filterType]);

  const stats = useMemo(() => {
    const counts: Record<RecognitionType, number> = {
      kudos: 0,
      award: 0,
      milestone: 0,
      shoutout: 0,
    };
    recognitions.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return { total: recognitions.length, ...counts };
  }, [recognitions]);

  // Top recognized employees
  const topRecognized = useMemo(() => {
    const countMap: Record<string, { name: string; count: number }> = {};
    recognitions.forEach((r) => {
      const name = r.to_profile?.full_name || 'Unknown';
      if (!countMap[r.to_user_id]) {
        countMap[r.to_user_id] = { name, count: 0 };
      }
      countMap[r.to_user_id].count += 1;
    });
    return Object.entries(countMap)
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [recognitions]);

  if (loading) {
    return (
      <div>
        <TopBar title="Recognition" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Recognition" subtitle="Celebrate and appreciate your colleagues" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Recognition</h1>
            <p className="text-slate-600">Celebrate and appreciate your colleagues</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Give Recognition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Give Recognition</DialogTitle>
                <DialogDescription>Show appreciation for a colleague's work</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Colleague</Label>
                  <Select
                    value={newRecognition.to_user_id}
                    onValueChange={(v) => setNewRecognition({ ...newRecognition, to_user_id: v })}
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
                    value={newRecognition.message}
                    onChange={(e) => setNewRecognition({ ...newRecognition, message: e.target.value })}
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

        {/* Stats */}
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

        {/* Top Recognized */}
        {topRecognized.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-4 w-4 text-amber-500" />
                Most Recognized Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topRecognized.map((person, i) => {
                  const medals = ['text-amber-500', 'text-slate-400', 'text-orange-600', 'text-slate-400', 'text-slate-400'];
                  return (
                    <div key={person.id} className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-7">
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
                      <span className="text-sm font-medium text-slate-700 flex-1">{person.name}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-semibold text-slate-600">{person.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-400" />
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All ({recognitions.length})
          </Button>
          {(['kudos', 'award', 'milestone', 'shoutout'] as RecognitionType[]).map((type) => {
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            const count = recognitions.filter((r) => r.type === type).length;
            return (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label} ({count})
              </Button>
            );
          })}
        </div>

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

        {/* Recognition Feed */}
        {!error && filteredRecognitions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No recognition yet</p>
              <p className="text-sm text-slate-400 mb-4">
                {filterType === 'all'
                  ? 'Be the first to recognize a colleague'
                  : `No ${typeConfig[filterType as RecognitionType].label.toLowerCase()} recognitions yet`}
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Give Recognition
              </Button>
            </CardContent>
          </Card>
        ) : (
          !error && (
            <div className="space-y-3">
              {filteredRecognitions.map((rec) => {
                const cfg = typeConfig[rec.type];
                const Icon = cfg.icon;
                return (
                  <Card key={rec.id} className="overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg ${cfg.bg} flex-shrink-0`}>
                          <Icon className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cfg.badge}>{cfg.label}</Badge>
                              <span className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  {rec.from_profile?.full_name || 'Someone'}
                                </span>
                                {' → '}
                                <span className="font-semibold text-slate-800">
                                  {rec.to_profile?.full_name || 'Someone'}
                                </span>
                              </span>
                            </div>
                            <span className="text-xs text-slate-400" title={format(new Date(rec.created_at), 'PPp')}>
                              {formatDistanceToNow(new Date(rec.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-2">{rec.message}</p>
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
