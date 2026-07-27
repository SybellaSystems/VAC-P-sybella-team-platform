'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Brain, Plus, Filter, Pencil, Trash2, CircleAlert as AlertCircle, Users, Award, TrendingUp, Search, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';

type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface SkillsMatrixEntry {
  id: string;
  profile_id: string;
  skill_name: string;
  proficiency: ProficiencyLevel;
  created_at: string;
  profile?: { id: string; full_name: string; department: string | null; role: string | null } | null;
}

interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  role: string | null;
}

const proficiencyConfig: Record<ProficiencyLevel, { label: string; badge: string; color: string; dot: string; value: number }> = {
  beginner: { label: 'Beginner', badge: 'bg-slate-100 text-slate-700', color: 'text-slate-600', dot: 'bg-slate-400', value: 1 },
  intermediate: { label: 'Intermediate', badge: 'bg-blue-100 text-blue-700', color: 'text-blue-600', dot: 'bg-blue-500', value: 2 },
  advanced: { label: 'Advanced', badge: 'bg-amber-100 text-amber-700', color: 'text-amber-600', dot: 'bg-amber-500', value: 3 },
  expert: { label: 'Expert', badge: 'bg-emerald-100 text-emerald-700', color: 'text-emerald-600', dot: 'bg-emerald-500', value: 4 },
};

export default function SkillsPage() {
  const { profile } = useAuth();
  const [skills, setSkills] = useState<SkillsMatrixEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SkillsMatrixEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterSkill, setFilterSkill] = useState('all');

  const [skillForm, setSkillForm] = useState({
    profile_id: '',
    skill_name: '',
    proficiency: 'beginner' as ProficiencyLevel,
  });

  useEffect(() => {
    if (profile) {
      fetchSkills();
      fetchProfiles();
    }
  }, [profile]);

  async function fetchSkills() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('skills_matrix')
        .select('*, profile:profiles!skills_matrix_profile_id_fkey(id, full_name, department, role)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills((data as SkillsMatrixEntry[]) || []);
    } catch (err: any) {
      console.error('Error fetching skills:', err);
      setError(err?.message || 'Failed to load skills matrix');
      toast.error('Failed to load skills matrix');
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfiles() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, department, role')
        .order('full_name');
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  }

  function openCreateDialog() {
    setEditingEntry(null);
    setSkillForm({ profile_id: '', skill_name: '', proficiency: 'beginner' });
    setShowDialog(true);
  }

  function openEditDialog(entry: SkillsMatrixEntry) {
    setEditingEntry(entry);
    setSkillForm({
      profile_id: entry.profile_id,
      skill_name: entry.skill_name,
      proficiency: entry.proficiency,
    });
    setShowDialog(true);
  }

  async function handleSaveSkill() {
    if (!skillForm.profile_id) {
      toast.error('Please select a team member');
      return;
    }
    if (!skillForm.skill_name.trim()) {
      toast.error('Skill name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingEntry) {
        const { error } = await supabase
          .from('skills_matrix')
          .update({
            profile_id: skillForm.profile_id,
            skill_name: skillForm.skill_name.trim(),
            proficiency: skillForm.proficiency,
          })
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Skill updated');
      } else {
        const { error } = await supabase.from('skills_matrix').insert({
          profile_id: skillForm.profile_id,
          skill_name: skillForm.skill_name.trim(),
          proficiency: skillForm.proficiency,
        });
        if (error) throw error;
        toast.success('Skill added');
      }
      setShowDialog(false);
      fetchSkills();
    } catch (err: any) {
      console.error('Error saving skill:', err);
      toast.error(err?.message || 'Failed to save skill');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSkill(skillId: string) {
    try {
      const { error } = await supabase.from('skills_matrix').delete().eq('id', skillId);
      if (error) throw error;
      toast.success('Skill removed');
      fetchSkills();
    } catch (err: any) {
      console.error('Error deleting skill:', err);
      toast.error('Failed to remove skill');
    }
  }

  // Get unique skill names and departments
  const allSkillNames = useMemo(() => {
    const set = new Set(skills.map((s) => s.skill_name));
    return Array.from(set).sort();
  }, [skills]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [profiles]);

  // Filter profiles based on search and department
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filterDepartment !== 'all' && p.department !== filterDepartment) return false;
      if (searchQuery && !p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [profiles, filterDepartment, searchQuery]);

  // Build matrix: profiles x skills
  const matrixData = useMemo(() => {
    const filteredSkillNames = filterSkill === 'all' ? allSkillNames : [filterSkill];
    const grid: Record<string, Record<string, SkillsMatrixEntry | null>> = {};

    filteredProfiles.forEach((p) => {
      grid[p.id] = {};
      filteredSkillNames.forEach((skillName) => {
        grid[p.id][skillName] =
          skills.find((s) => s.profile_id === p.id && s.skill_name === skillName) || null;
      });
    });

    return { grid, skillNames: filteredSkillNames };
  }, [filteredProfiles, skills, allSkillNames, filterSkill]);

  const stats = useMemo(() => {
    const expertCount = skills.filter((s) => s.proficiency === 'expert').length;
    const advancedCount = skills.filter((s) => s.proficiency === 'advanced').length;
    const uniqueSkills = allSkillNames.length;
    const coveredMembers = new Set(skills.map((s) => s.profile_id)).size;
    return { total: skills.length, expert: expertCount, advanced: advancedCount, uniqueSkills, coveredMembers };
  }, [skills, allSkillNames]);

  // Top skills by average proficiency
  const topSkills = useMemo(() => {
    const skillAgg: Record<string, { total: number; count: number }> = {};
    skills.forEach((s) => {
      if (!skillAgg[s.skill_name]) skillAgg[s.skill_name] = { total: 0, count: 0 };
      skillAgg[s.skill_name].total += proficiencyConfig[s.proficiency].value;
      skillAgg[s.skill_name].count += 1;
    });
    return Object.entries(skillAgg)
      .map(([name, agg]) => ({ name, avg: agg.count > 0 ? agg.total / agg.count : 0, count: agg.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
  }, [skills]);

  if (loading) {
    return (
      <div>
        <TopBar title="Skills Matrix" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Skills Matrix" subtitle="Map team competencies across skills and proficiency levels" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Skills Matrix</h1>
            <p className="text-slate-600">Map team competencies across skills and proficiency levels</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Skill
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.uniqueSkills}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Unique Skills</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.coveredMembers}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Members Tracked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Award className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.expert}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Expert Level</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">{stats.advanced}</span>
              </div>
              <p className="text-sm font-medium text-slate-700">Advanced Level</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Skills */}
        {topSkills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Top Skills by Average Proficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topSkills.map((skill, i) => (
                  <div key={skill.name} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                    <span className="text-sm font-medium text-slate-700 w-32 truncate">{skill.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-emerald-500"
                        style={{ width: `${(skill.avg / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 min-w-[3rem] text-right">
                      {(skill.avg / 4 * 100).toFixed(0)}% ({skill.count})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="h-4 w-4 text-slate-400" />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="pl-8 w-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Department</Label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Skill</Label>
                <Select value={filterSkill} onValueChange={setFilterSkill}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    {allSkillNames.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterDepartment !== 'all' || filterSkill !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterDepartment('all');
                    setFilterSkill('all');
                    setSearchQuery('');
                  }}
                  className="mt-5"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchSkills} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Matrix */}
        {!error && filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Grid3x3 className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No members found</p>
              <p className="text-sm text-slate-400 mb-4">
                {profiles.length === 0 ? 'No profiles available' : 'Try adjusting your filters'}
              </p>
            </CardContent>
          </Card>
        ) : !error && matrixData.skillNames.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500 mb-2">No skills tracked yet</p>
              <p className="text-sm text-slate-400 mb-4">Add skills for team members to build the matrix</p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Skill
              </Button>
            </CardContent>
          </Card>
        ) : (
          !error && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4 text-blue-600" />
                  Skills Matrix
                </CardTitle>
                <CardDescription>
                  {filteredProfiles.length} members × {matrixData.skillNames.length} skills
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-semibold text-slate-500 p-2 sticky left-0 bg-white z-10 min-w-[140px]">
                          Member
                        </th>
                        {matrixData.skillNames.map((skillName) => (
                          <th key={skillName} className="text-center text-xs font-semibold text-slate-500 p-2 min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="truncate max-w-[90px]" title={skillName}>{skillName}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center text-xs font-semibold text-slate-500 p-2 min-w-[60px]">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProfiles.map((p) => {
                        const memberSkills = skills.filter((s) => s.profile_id === p.id);
                        const avgProficiency =
                          memberSkills.length > 0
                            ? memberSkills.reduce((sum, s) => sum + proficiencyConfig[s.proficiency].value, 0) /
                              memberSkills.length
                            : 0;
                        return (
                          <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="p-2 sticky left-0 bg-white z-10">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-blue-700">
                                    {p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{p.full_name}</p>
                                  {p.department && (
                                    <p className="text-xs text-slate-400 truncate">{p.department}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            {matrixData.skillNames.map((skillName) => {
                              const entry = matrixData.grid[p.id]?.[skillName];
                              if (!entry) {
                                return (
                                  <td key={skillName} className="p-2 text-center">
                                    <span className="text-slate-300 text-xs">—</span>
                                  </td>
                                );
                              }
                              const cfg = proficiencyConfig[entry.proficiency];
                              return (
                                <td key={skillName} className="p-2 text-center">
                                  <div className="group relative inline-flex">
                                    <div className={`w-2 h-2 rounded-full ${cfg.dot} mx-auto`} title={`${skillName}: ${cfg.label}`} />
                                    <div className="hidden group-hover:absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                                      {cfg.label}
                                      <div className="flex gap-1 mt-1">
                                        <button
                                          onClick={() => openEditDialog(entry)}
                                          className="p-0.5 hover:text-blue-300"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSkill(entry.id)}
                                          className="p-0.5 hover:text-red-300"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="p-2 text-center">
                              <span className="text-xs font-semibold text-slate-600">
                                {avgProficiency > 0 ? `${(avgProficiency / 4 * 100).toFixed(0)}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 justify-center flex-wrap">
                  {(['beginner', 'intermediate', 'advanced', 'expert'] as ProficiencyLevel[]).map((level) => {
                    const cfg = proficiencyConfig[level];
                    return (
                      <div key={level} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-slate-600">{cfg.label}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 text-xs">—</span>
                    <span className="text-xs text-slate-600">Not assessed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Add/Edit Skill Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
            <DialogDescription>
              {editingEntry ? 'Update proficiency for this skill' : 'Assign a skill to a team member'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team Member</Label>
              <Select
                value={skillForm.profile_id}
                onValueChange={(v) => setSkillForm({ ...skillForm, profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}{p.department ? ` · ${p.department}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Skill Name</Label>
              <Input
                value={skillForm.skill_name}
                onChange={(e) => setSkillForm({ ...skillForm, skill_name: e.target.value })}
                placeholder="e.g. React, Project Management, Python"
                list="existing-skills"
              />
              <datalist id="existing-skills">
                {allSkillNames.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Proficiency Level</Label>
              <Select
                value={skillForm.proficiency}
                onValueChange={(v: ProficiencyLevel) => setSkillForm({ ...skillForm, proficiency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['beginner', 'intermediate', 'advanced', 'expert'] as ProficiencyLevel[]).map((level) => {
                    const cfg = proficiencyConfig[level];
                    return (
                      <SelectItem key={level} value={level}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {/* Visual proficiency selector */}
            <div className="flex items-center gap-2 justify-center pt-2">
              {(['beginner', 'intermediate', 'advanced', 'expert'] as ProficiencyLevel[]).map((level, i) => {
                const cfg = proficiencyConfig[level];
                const isActive = proficiencyConfig[skillForm.proficiency].value >= i + 1;
                return (
                  <button
                    key={level}
                    onClick={() => setSkillForm({ ...skillForm, proficiency: level })}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isActive ? `${cfg.dot} text-white` : 'bg-slate-100 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <span className={`text-[10px] ${isActive ? cfg.color : 'text-slate-300'}`}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSkill} disabled={submitting}>
              {submitting ? 'Saving...' : editingEntry ? 'Update Skill' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
