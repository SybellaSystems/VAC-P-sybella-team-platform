'use client';

import { useEffect, useState, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, ClipboardCheck, UserPlus, Star, Plus, Pencil, Trash2, Briefcase, CircleCheck as CheckCircle2, Circle, CircleAlert as AlertCircle, Search, HeartPulse, Calendar } from 'lucide-react';

/* ----------------------------- Types ----------------------------- */

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  stage: string;
  source: string;
  rating: number;
  notes: string;
  created_at: string;
};

type PerformanceReview = {
  id: string;
  member_id: string;
  reviewer_id: string;
  cycle: string;
  rating: number;
  status: string;
  strengths: string;
  areas_for_improvement: string;
  goals: string;
  comments: string;
  created_at: string;
  member?: { full_name: string };
  reviewer?: { full_name: string };
};

type OnboardingTask = {
  id: string;
  member_id: string;
  title: string;
  category: string;
  due_date: string;
  is_done: boolean;
  created_at: string;
  member?: { full_name: string };
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  department: string;
};

/* --------------------------- Constants ---------------------------- */

const CANDIDATE_STAGES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'hired',
  'rejected',
] as const;

const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-slate-100 text-slate-700',
  screening: 'bg-blue-100 text-blue-700',
  interview: 'bg-violet-100 text-violet-700',
  offer: 'bg-amber-100 text-amber-700',
  hired: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const REVIEW_STATUS = ['draft', 'in_progress', 'submitted', 'completed'];
const REVIEW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const ONBOARDING_CATEGORIES = [
  'documentation',
  'orientation',
  'training',
  'access',
  'meetings',
];

/* ----------------------------- Page ------------------------------- */

export default function HRHubPage() {
  const { profile } = useAuth();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // candidate UI state
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateDialog, setCandidateDialog] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState<Partial<Candidate>>({});
  const [savingCandidate, setSavingCandidate] = useState(false);

  // review UI state
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [reviewForm, setReviewForm] = useState<Partial<PerformanceReview>>({});
  const [savingReview, setSavingReview] = useState(false);

  // onboarding UI state
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<OnboardingTask | null>(null);
  const [taskForm, setTaskForm] = useState<Partial<OnboardingTask>>({});
  const [savingTask, setSavingTask] = useState(false);

  const canManage = ['admin', 'director', 'manager', 'hr'].includes(
    profile?.role || ''
  );

  /* ----------------------------- Data ------------------------------ */

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [cand, rev, task, prof] = await Promise.all([
        supabase
          .from('hr_candidates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('hr_performance_reviews')
          .select('*, member:profiles!hr_performance_reviews_member_id_fkey(full_name), reviewer:profiles!hr_performance_reviews_reviewer_id_fkey(full_name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('hr_onboarding_tasks')
          .select('*, member:profiles!hr_onboarding_tasks_member_id_fkey(full_name)')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,full_name,email,department').order('full_name'),
      ]);

      if (cand.error) throw cand.error;
      if (rev.error) throw rev.error;
      if (task.error) throw task.error;
      if (prof.error) throw prof.error;

      setCandidates((cand.data as Candidate[]) || []);
      setReviews((rev.data as PerformanceReview[]) || []);
      setTasks((task.data as OnboardingTask[]) || []);
      setProfiles((prof.data as Profile[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------- Candidates --------------------------- */

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchStage = stageFilter === 'all' || c.stage === stageFilter;
      const q = candidateSearch.toLowerCase();
      const matchSearch =
        !q ||
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.position?.toLowerCase().includes(q);
      return matchStage && matchSearch;
    });
  }, [candidates, stageFilter, candidateSearch]);

  function openNewCandidate() {
    setEditingCandidate(null);
    setCandidateForm({
      stage: 'applied',
      rating: 3,
      source: '',
      position: '',
      department: '',
      full_name: '',
      email: '',
      phone: '',
      notes: '',
    });
    setCandidateDialog(true);
  }

  function openEditCandidate(c: Candidate) {
    setEditingCandidate(c);
    setCandidateForm({ ...c });
    setCandidateDialog(true);
  }

  async function saveCandidate() {
    if (!candidateForm.full_name?.trim()) return;
    setSavingCandidate(true);
    try {
      if (editingCandidate) {
        const { error } = await supabase
          .from('hr_candidates')
          .update({
            full_name: candidateForm.full_name,
            email: candidateForm.email,
            phone: candidateForm.phone,
            position: candidateForm.position,
            department: candidateForm.department,
            stage: candidateForm.stage,
            source: candidateForm.source,
            rating: Number(candidateForm.rating) || 0,
            notes: candidateForm.notes,
          })
          .eq('id', editingCandidate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_candidates').insert({
          full_name: candidateForm.full_name,
          email: candidateForm.email,
          phone: candidateForm.phone,
          position: candidateForm.position,
          department: candidateForm.department,
          stage: candidateForm.stage,
          source: candidateForm.source,
          rating: Number(candidateForm.rating) || 0,
          notes: candidateForm.notes,
          created_by: profile?.id,
        });
        if (error) throw error;
      }
      setCandidateDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save candidate');
    } finally {
      setSavingCandidate(false);
    }
  }

  async function deleteCandidate(id: string) {
    if (!confirm('Delete this candidate?')) return;
    const { error } = await supabase.from('hr_candidates').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* --------------------------- Reviews ----------------------------- */

  function openNewReview() {
    setEditingReview(null);
    setReviewForm({
      member_id: profiles[0]?.id || '',
      reviewer_id: profile?.id || '',
      cycle: new Date().getFullYear() + ' H1',
      rating: 3,
      status: 'draft',
      strengths: '',
      areas_for_improvement: '',
      goals: '',
      comments: '',
    });
    setReviewDialog(true);
  }

  function openEditReview(r: PerformanceReview) {
    setEditingReview(r);
    setReviewForm({ ...r });
    setReviewDialog(true);
  }

  async function saveReview() {
    if (!reviewForm.member_id) return;
    setSavingReview(true);
    try {
      const payload = {
        member_id: reviewForm.member_id,
        reviewer_id: reviewForm.reviewer_id || profile?.id,
        cycle: reviewForm.cycle,
        rating: Number(reviewForm.rating) || 0,
        status: reviewForm.status,
        strengths: reviewForm.strengths,
        areas_for_improvement: reviewForm.areas_for_improvement,
        goals: reviewForm.goals,
        comments: reviewForm.comments,
      };
      if (editingReview) {
        const { error } = await supabase
          .from('hr_performance_reviews')
          .update(payload)
          .eq('id', editingReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_performance_reviews').insert(payload);
        if (error) throw error;
      }
      setReviewDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save review');
    } finally {
      setSavingReview(false);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review?')) return;
    const { error } = await supabase.from('hr_performance_reviews').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* -------------------------- Onboarding --------------------------- */

  function openNewTask() {
    setEditingTask(null);
    setTaskForm({
      member_id: profiles[0]?.id || '',
      title: '',
      category: 'documentation',
      due_date: '',
      is_done: false,
    });
    setTaskDialog(true);
  }

  function openEditTask(t: OnboardingTask) {
    setEditingTask(t);
    setTaskForm({ ...t });
    setTaskDialog(true);
  }

  async function saveTask() {
    if (!taskForm.title?.trim() || !taskForm.member_id) return;
    setSavingTask(true);
    try {
      const payload = {
        member_id: taskForm.member_id,
        title: taskForm.title,
        category: taskForm.category,
        due_date: taskForm.due_date || null,
        is_done: taskForm.is_done || false,
      };
      if (editingTask) {
        const { error } = await supabase
          .from('hr_onboarding_tasks')
          .update(payload)
          .eq('id', editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hr_onboarding_tasks').insert(payload);
        if (error) throw error;
      }
      setTaskDialog(false);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  }

  async function toggleTask(t: OnboardingTask) {
    const { error } = await supabase
      .from('hr_onboarding_tasks')
      .update({ is_done: !t.is_done })
      .eq('id', t.id);
    if (error) {
      setError(error.message);
      return;
    }
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, is_done: !x.is_done } : x))
    );
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return;
    const { error } = await supabase.from('hr_onboarding_tasks').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  /* ---------------------------- Stats ------------------------------ */

  const totalCandidates = candidates.length;
  const activeReviews = reviews.filter(
    (r) => r.status === 'in_progress' || r.status === 'submitted'
  ).length;
  const onboardingCompletion =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.is_done).length / tasks.length) * 100)
      : 0;
  const openPositions = new Set(
    candidates
      .filter((c) => c.stage !== 'hired' && c.stage !== 'rejected')
      .map((c) => c.position)
      .filter(Boolean)
  ).size;

  /* --------------------------- Render ------------------------------- */

  return (
    <div>
      <TopBar title="HR Hub" subtitle="Human resources management" />
      <div className="p-4 sm:p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={16} />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Candidates</CardDescription>
              <CardTitle className="text-2xl">{totalCandidates}</CardTitle>
            </CardHeader>
            <CardContent>
              <Users className="h-4 w-4 text-blue-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Reviews</CardDescription>
              <CardTitle className="text-2xl">{activeReviews}</CardTitle>
            </CardHeader>
            <CardContent>
              <ClipboardCheck className="h-4 w-4 text-amber-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Onboarding Completion</CardDescription>
              <CardTitle className="text-2xl">{onboardingCompletion}%</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open Positions</CardDescription>
              <CardTitle className="text-2xl">{openPositions}</CardTitle>
            </CardHeader>
            <CardContent>
              <Briefcase className="h-4 w-4 text-violet-600" />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="candidates">
          <TabsList>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          {/* ----------------------- Candidates ----------------------- */}
          <TabsContent value="candidates" className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={candidateSearch}
                    onChange={(e) => setCandidateSearch(e.target.value)}
                    placeholder="Search candidates..."
                    className="pl-9 w-52"
                  />
                </div>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {CANDIDATE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <Button onClick={openNewCandidate}>
                  <Plus size={16} className="mr-1.5" /> Add Candidate
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-14 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserPlus className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 mb-1">No candidates found</p>
                    <p className="text-xs text-slate-400">
                      {canManage
                        ? 'Add your first candidate to get started.'
                        : 'Candidates will appear here once added.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Candidate</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Position</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Department</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Stage</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Rating</th>
                          <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Source</th>
                          {canManage && <th className="px-5 py-3 w-20" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCandidates.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/20">
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-foreground">{c.full_name}</p>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </td>
                            <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">{c.position || '—'}</td>
                            <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground">{c.department || '—'}</td>
                            <td className="px-5 py-3.5">
                              <Badge className={STAGE_COLORS[c.stage] || 'bg-slate-100 text-slate-700'}>
                                {c.stage}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1">
                                <Star size={13} className="fill-amber-400 text-amber-400" />
                                <span className="text-xs font-medium">{c.rating || 0}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 hidden sm:table-cell text-muted-foreground text-xs">{c.source || '—'}</td>
                            {canManage && (
                              <td className="px-5 py-3.5">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditCandidate(c)}>
                                    <Pencil size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteCandidate(c.id)}>
                                    <Trash2 size={14} className="text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ------------------------ Reviews ------------------------- */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{reviews.length} reviews</p>
              {canManage && (
                <Button onClick={openNewReview}>
                  <Plus size={16} className="mr-1.5" /> Add Review
                </Button>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </CardContent>
              </Card>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-1">No performance reviews yet</p>
                  <p className="text-xs text-slate-400">
                    {canManage ? 'Create a review to get started.' : 'Reviews will appear here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{r.member?.full_name || 'Unknown'}</CardTitle>
                          <CardDescription>Reviewer: {r.reviewer?.full_name || '—'} · {r.cycle}</CardDescription>
                        </div>
                        <Badge className={REVIEW_STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-700'}>
                          {r.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold">{r.rating}/5</span>
                      </div>
                      {r.strengths && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                          <p className="text-sm text-foreground line-clamp-2">{r.strengths}</p>
                        </div>
                      )}
                      {r.goals && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Goals</p>
                          <p className="text-sm text-foreground line-clamp-2">{r.goals}</p>
                        </div>
                      )}
                      {canManage && (
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => openEditReview(r)}>
                            <Pencil size={13} className="mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteReview(r.id)}>
                            <Trash2 size={13} className="mr-1 text-red-500" /> Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ------------------------ Onboarding ---------------------- */}
          <TabsContent value="onboarding" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {tasks.filter((t) => t.is_done).length}/{tasks.length} tasks complete
              </p>
              {canManage && (
                <Button onClick={openNewTask}>
                  <Plus size={16} className="mr-1.5" /> Add Task
                </Button>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                  ))}
                </CardContent>
              </Card>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-1">No onboarding tasks</p>
                  <p className="text-xs text-slate-400">
                    {canManage ? 'Add a task to start onboarding a team member.' : 'Tasks will appear here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20">
                        <button onClick={() => toggleTask(t)} className="flex-shrink-0">
                          {t.is_done ? (
                            <CheckCircle2 size={20} className="text-emerald-500" />
                          ) : (
                            <Circle size={20} className="text-slate-300" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${t.is_done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {t.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t.member?.full_name || 'Unassigned'} · {t.category}
                            {t.due_date && ` · due ${new Date(t.due_date).toLocaleDateString()}`}
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditTask(t)}>
                              <Pencil size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteTask(t.id)}>
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* --------------------- Candidate Dialog -------------------- */}
      <Dialog open={candidateDialog} onOpenChange={setCandidateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCandidate ? 'Edit Candidate' : 'Add Candidate'}</DialogTitle>
            <DialogDescription>
              {editingCandidate ? 'Update candidate details.' : 'Add a new candidate to the pipeline.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={candidateForm.full_name || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={candidateForm.email || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={candidateForm.phone || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Position</Label>
                <Input
                  value={candidateForm.position || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, position: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Department</Label>
                <Input
                  value={candidateForm.department || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, department: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Input
                  value={candidateForm.source || ''}
                  onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })}
                  placeholder="LinkedIn, Referral..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Stage</Label>
                <Select
                  value={candidateForm.stage || 'applied'}
                  onValueChange={(v) => setCandidateForm({ ...candidateForm, stage: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rating (1-5)</Label>
                <Select
                  value={String(candidateForm.rating || 3)}
                  onValueChange={(v) => setCandidateForm({ ...candidateForm, rating: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} Star{n > 1 ? 's' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={candidateForm.notes || ''}
                onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandidateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveCandidate} disabled={savingCandidate}>
              {savingCandidate ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------- Review Dialog ---------------------- */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReview ? 'Edit Review' : 'Add Performance Review'}</DialogTitle>
            <DialogDescription>
              {editingReview ? 'Update review details.' : 'Create a new performance review.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Team Member *</Label>
                <Select
                  value={reviewForm.member_id || ''}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, member_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Cycle</Label>
                <Input
                  value={reviewForm.cycle || ''}
                  onChange={(e) => setReviewForm({ ...reviewForm, cycle: e.target.value })}
                  placeholder="2024 H1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Rating (1-5)</Label>
                <Select
                  value={String(reviewForm.rating || 3)}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, rating: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / 5
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select
                  value={reviewForm.status || 'draft'}
                  onValueChange={(v) => setReviewForm({ ...reviewForm, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEW_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Strengths</Label>
              <Textarea
                value={reviewForm.strengths || ''}
                onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Areas for Improvement</Label>
              <Textarea
                value={reviewForm.areas_for_improvement || ''}
                onChange={(e) => setReviewForm({ ...reviewForm, areas_for_improvement: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Goals</Label>
              <Textarea
                value={reviewForm.goals || ''}
                onChange={(e) => setReviewForm({ ...reviewForm, goals: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Comments</Label>
              <Textarea
                value={reviewForm.comments || ''}
                onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveReview} disabled={savingReview}>
              {savingReview ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --------------------- Onboarding Dialog ------------------- */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Onboarding Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details.' : 'Create a new onboarding task.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Team Member *</Label>
              <Select
                value={taskForm.member_id || ''}
                onValueChange={(v) => setTaskForm({ ...taskForm, member_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={taskForm.title || ''}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={taskForm.category || 'documentation'}
                  onValueChange={(v) => setTaskForm({ ...taskForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={taskForm.due_date ? taskForm.due_date.slice(0, 10) : ''}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveTask} disabled={savingTask}>
              {savingTask ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
