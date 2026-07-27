'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogIn, LogOut, CircleCheck as CheckCircle, Circle as XCircle, Calendar, Users, TrendingUp } from 'lucide-react';

type CheckIn = {
  id: string;
  member_id: string;
  check_in_date: string;
  availability: string;
  priorities: string;
  expected_deliverables: string;
  planned_meetings: string;
  known_blockers: string;
  assistance_required: string;
  status: string;
  submitted_at: string | null;
};

type CheckOut = {
  id: string;
  member_id: string;
  check_out_date: string;
  work_completed: string;
  deliverables_produced: string;
  time_spent_hours: number;
  outstanding_work: string;
  challenges_encountered: string;
  tomorrow_priorities: string;
  lessons_learned: string;
  status: string;
  submitted_at: string | null;
};

type Profile = { id: string; full_name: string; role: string; department: string };

export default function CheckInOutPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'checkin' | 'checkout'>('checkin');
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [todayCheckOut, setTodayCheckOut] = useState<CheckOut | null>(null);
  const [teamCheckIns, setTeamCheckIns] = useState<Record<string, CheckIn>>({});
  const [teamCheckOuts, setTeamCheckOuts] = useState<Record<string, CheckOut>>({});
  const [members, setMembers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const canViewTeam = ['admin', 'director', 'manager', 'hr'].includes(profile?.role || '');

  const [checkInForm, setCheckInForm] = useState({
    availability: 'available',
    priorities: '',
    expected_deliverables: '',
    planned_meetings: '',
    known_blockers: '',
    assistance_required: '',
  });

  const [checkOutForm, setCheckOutForm] = useState({
    work_completed: '',
    deliverables_produced: '',
    time_spent_hours: 0,
    outstanding_work: '',
    challenges_encountered: '',
    tomorrow_priorities: '',
    lessons_learned: '',
  });

  useEffect(() => {
    if (profile) loadAll();
  }, [profile]);

  const loadAll = async () => {
    if (!profile) return;
    const [cinRes, coutRes, profsRes] = await Promise.all([
      supabase.from('daily_check_ins').select('*').eq('check_in_date', today),
      supabase.from('daily_check_outs').select('*').eq('check_out_date', today),
      supabase.from('profiles').select('*'),
    ]);

    const allCheckIns = (cinRes.data as CheckIn[]) || [];
    const allCheckOuts = (coutRes.data as CheckOut[]) || [];
    const profMap: Record<string, Profile> = {};
    (profsRes.data as Profile[] || []).forEach(p => { profMap[p.id] = p; });
    setMembers(profMap);

    setTodayCheckIn(allCheckIns.find(c => c.member_id === profile.id) || null);
    setTodayCheckOut(allCheckOuts.find(c => c.member_id === profile.id) || null);

    const cinMap: Record<string, CheckIn> = {};
    allCheckIns.forEach(c => { cinMap[c.member_id] = c; });
    setTeamCheckIns(cinMap);

    const coutMap: Record<string, CheckOut> = {};
    allCheckOuts.forEach(c => { coutMap[c.member_id] = c; });
    setTeamCheckOuts(coutMap);

    setLoading(false);
  };

  const submitCheckIn = async () => {
    if (!profile) return;
    setSaving(true);
    if (todayCheckIn) {
      await supabase.from('daily_check_ins').update({
        ...checkInForm,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', todayCheckIn.id);
    } else {
      await supabase.from('daily_check_ins').insert({
        ...checkInForm,
        member_id: profile.id,
        check_in_date: today,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
    }
    await loadAll();
    setSaving(false);
  };

  const submitCheckOut = async () => {
    if (!profile) return;
    setSaving(true);
    if (todayCheckOut) {
      await supabase.from('daily_check_outs').update({
        ...checkOutForm,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }).eq('id', todayCheckOut.id);
    } else {
      await supabase.from('daily_check_outs').insert({
        ...checkOutForm,
        member_id: profile.id,
        check_out_date: today,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });
    }
    await loadAll();
    setSaving(false);
  };

  const checkedInToday = todayCheckIn?.status === 'submitted';
  const checkedOutToday = todayCheckOut?.status === 'submitted';

  if (loading) {
    return (
      <div>
        <TopBar title="Daily Check-In / Check-Out" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Daily Check-In / Check-Out" subtitle="Start and end your day with intention" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Status cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${checkedInToday ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                <LogIn size={18} className={checkedInToday ? 'text-emerald-600' : 'text-slate-400'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{checkedInToday ? 'Checked In' : 'Not Checked In'}</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${checkedOutToday ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                <LogOut size={18} className={checkedOutToday ? 'text-emerald-600' : 'text-slate-400'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{checkedOutToday ? 'Checked Out' : 'Not Checked Out'}</p>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
          {canViewTeam && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{Object.values(teamCheckIns).filter(c => c.status === 'submitted').length}</p>
                  <p className="text-xs text-muted-foreground">Team Checked In</p>
                </div>
              </CardContent>
            </Card>
          )}
          {canViewTeam && (
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{Object.values(teamCheckOuts).filter(c => c.status === 'submitted').length}</p>
                  <p className="text-xs text-muted-foreground">Team Checked Out</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tab switch */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('checkin')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-all ${tab === 'checkin' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
          >
            <LogIn size={15} className="inline mr-1.5" /> Morning Check-In
          </button>
          <button
            onClick={() => setTab('checkout')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg border transition-all ${tab === 'checkout' ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}
          >
            <LogOut size={15} className="inline mr-1.5" /> Evening Check-Out
          </button>
        </div>

        {/* Check-in form */}
        {tab === 'checkin' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Morning Check-In</CardTitle>
              <CardDescription>Set your intentions for the day before starting work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkedInToday && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <p className="text-xs text-emerald-700">You've checked in for today. Update anytime.</p>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Availability Status</Label>
                <Select value={checkInForm.availability} onValueChange={v => setCheckInForm({ ...checkInForm, availability: v })}>
                  <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Today's Priorities</Label>
                <Textarea value={checkInForm.priorities} onChange={e => setCheckInForm({ ...checkInForm, priorities: e.target.value })} placeholder="What are your top priorities today?" rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Expected Deliverables</Label>
                <Textarea value={checkInForm.expected_deliverables} onChange={e => setCheckInForm({ ...checkInForm, expected_deliverables: e.target.value })} placeholder="What do you expect to deliver today?" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Planned Meetings</Label>
                  <Textarea value={checkInForm.planned_meetings} onChange={e => setCheckInForm({ ...checkInForm, planned_meetings: e.target.value })} placeholder="Meetings scheduled today..." rows={2} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Known Blockers</Label>
                  <Textarea value={checkInForm.known_blockers} onChange={e => setCheckInForm({ ...checkInForm, known_blockers: e.target.value })} placeholder="Any blockers you're aware of..." rows={2} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Assistance Required</Label>
                <Textarea value={checkInForm.assistance_required} onChange={e => setCheckInForm({ ...checkInForm, assistance_required: e.target.value })} placeholder="Do you need help from anyone?" rows={2} />
              </div>
              <Button onClick={submitCheckIn} disabled={saving} className="w-full">
                {saving ? 'Submitting...' : checkedInToday ? 'Update Check-In' : 'Submit Check-In'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Check-out form */}
        {tab === 'checkout' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evening Check-Out</CardTitle>
              <CardDescription>Reflect on what you accomplished today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkedOutToday && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <p className="text-xs text-emerald-700">You've checked out for today. Update anytime.</p>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Work Completed</Label>
                <Textarea value={checkOutForm.work_completed} onChange={e => setCheckOutForm({ ...checkOutForm, work_completed: e.target.value })} placeholder="What did you complete today?" rows={2} />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Deliverables Produced</Label>
                <Textarea value={checkOutForm.deliverables_produced} onChange={e => setCheckOutForm({ ...checkOutForm, deliverables_produced: e.target.value })} placeholder="What tangible outputs did you produce?" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Time Spent (hours)</Label>
                  <Input type="number" step="0.5" value={checkOutForm.time_spent_hours} onChange={e => setCheckOutForm({ ...checkOutForm, time_spent_hours: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Outstanding Work</Label>
                  <Textarea value={checkOutForm.outstanding_work} onChange={e => setCheckOutForm({ ...checkOutForm, outstanding_work: e.target.value })} placeholder="What's still pending?" rows={1} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5">Challenges Encountered</Label>
                <Textarea value={checkOutForm.challenges_encountered} onChange={e => setCheckOutForm({ ...checkOutForm, challenges_encountered: e.target.value })} placeholder="Any difficulties faced today?" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Tomorrow's Priorities</Label>
                  <Textarea value={checkOutForm.tomorrow_priorities} onChange={e => setCheckOutForm({ ...checkOutForm, tomorrow_priorities: e.target.value })} placeholder="What will you focus on tomorrow?" rows={2} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5">Lessons Learned</Label>
                  <Textarea value={checkOutForm.lessons_learned} onChange={e => setCheckOutForm({ ...checkOutForm, lessons_learned: e.target.value })} placeholder="Any insights or lessons?" rows={2} />
                </div>
              </div>
              <Button onClick={submitCheckOut} disabled={saving} className="w-full">
                {saving ? 'Submitting...' : checkedOutToday ? 'Update Check-Out' : 'Submit Check-Out'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Team overview */}
        {canViewTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Status Today</CardTitle>
              <CardDescription>Who has checked in and out</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.values(members).map(member => {
                  const cin = teamCheckIns[member.id];
                  const cout = teamCheckOuts[member.id];
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[10px] font-bold">{member.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{cin?.priorities || 'No check-in'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {cin?.status === 'submitted' ? <CheckCircle size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-300" />}
                        {cout?.status === 'submitted' ? <CheckCircle size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-slate-300" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
