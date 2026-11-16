'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Edit2, UserPlus } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';
import { isAdminProfile } from '@/lib/rbac';

type Department = { id: string; name: string };
type MemberDraft = {
  id?: string;
  email: string;
  full_name: string;
  role: string;
  department_id: string;
  title: string;
  joining_date: string;
  supervisor_id: string;
  phone: string;
  bio: string;
};
const roles = ['intern', 'partner', 'developer', 'designer', 'qa', 'manager', 'sales', 'marketing_manager', 'legal_counsel', 'finance', 'hr'];
const blankDraft = (): MemberDraft => ({
  email: '',
  full_name: '',
  role: 'intern',
  department_id: '',
  title: '',
  joining_date: new Date().toISOString().slice(0, 10),
  supervisor_id: '',
  phone: '',
  bio: '',
});

export default function TeamPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const canManage = isAdminProfile(profile);
  const [members, setMembers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [draft, setDraft] = useState<MemberDraft>(blankDraft());
  const [saving, setSaving] = useState(false);

  const loadTeam = async () => {
    setLoading(true);
    setError('');
    const [people, departmentsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('departments').select('id, name').order('name'),
    ]);
    if (people.error || departmentsResult.error) {
      const issue = people.error || departmentsResult.error;
      console.error('Unable to load team directory:', issue?.message);
      setError(issue?.message || 'Unable to load the team directory.');
    } else {
      setMembers((people.data || []) as Profile[]);
      setDepartments((departmentsResult.data || []) as Department[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadTeam(); }, [profile?.id]);

  const visibleMembers = useMemo(() => members.filter((member) => {
    if (member.role === 'deleted') return false;
    const matchesText = `${member.full_name} ${member.email} ${member.department} ${member.title || ''}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (roleFilter === 'all' || member.role === roleFilter);
  }), [members, query, roleFilter]);

  const groupedMembers = useMemo(() => {
    const groups = new Map<string, { name: string; members: Profile[] }>();
    for (const member of visibleMembers) {
      const departmentName = member.department_id
        ? departments.find((department) => department.id === member.department_id)?.name || 'Unassigned'
        : 'Unassigned';
      const key = departmentName.toLocaleLowerCase();
      const group = groups.get(key) || { name: departmentName, members: [] };
      group.members.push(member);
      groups.set(key, group);
    }
    return Array.from(groups.values()).sort((first, second) => {
      if (first.name === 'Unassigned') return 1;
      if (second.name === 'Unassigned') return -1;
      return first.name.localeCompare(second.name);
    });
  }, [departments, visibleMembers]);

  const submit = async () => {
    if (saving) return;
    if (!draft.department_id) {
      setError('Select a department for every team member.');
      return;
    }
    if (!draft.full_name.trim() || (modal === 'add' && !draft.email.trim())) {
      setError('Full name and email are required.');
      return;
    }
    setSaving(true);
    setError('');
    let saveError: string | null = null;
    if (modal === 'add') {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          email: draft.email,
          full_name: draft.full_name,
          role: draft.role,
          department_id: draft.department_id || null,
          title: draft.title,
          joining_date: draft.joining_date || null,
          supervisor_id: draft.supervisor_id || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) saveError = result.error || 'Unable to invite this user.';
    } else if (draft.id) {
      const { error: updateError } = await supabase.from('profiles').update({
        full_name: draft.full_name.trim(),
        role: draft.role,
        department_id: draft.department_id || null,
        department: departments.find((department) => department.id === draft.department_id)?.name || '',
        title: draft.title.trim(),
        joining_date: draft.joining_date || null,
        supervisor_id: draft.supervisor_id || null,
        phone: draft.phone.trim(),
        bio: draft.bio.trim(),
      }).eq('id', draft.id);
      if (updateError) saveError = updateError.message;
    }

    if (saveError) {
      console.error('Unable to save team member:', saveError);
      setError(saveError);
      setSaving(false);
      return;
    }
    setSaving(false);
    setModal(null);
    setDraft(blankDraft());
    await loadTeam();
  };

  if (loading) return <div><TopBar title="Team" subtitle="Loading team directory" /><SybellaLoadingState text="Loading team" /></div>;

  return (
    <div>
      <TopBar title="Team" subtitle={`${members.length} team members · interns and partners included`} />
      <main className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs font-medium text-slate-600">
              <span className="sr-only">Search team</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people and departments" className="h-10 min-w-56 rounded-md border border-input bg-white px-3 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              <span className="sr-only">Filter by access type</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-10 rounded-md border border-input bg-white px-3 text-sm">
                <option value="all">All access types</option>
                {members.reduce<string[]>((uniqueRoles, member) => {
                  if (!uniqueRoles.includes(member.role)) uniqueRoles.push(member.role);
                  return uniqueRoles;
                }, []).sort().map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
          </div>
          {canManage && <button type="button" onClick={() => { setDraft(blankDraft()); setModal('add'); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"><UserPlus size={16} /> Invite user</button>}
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {canManage && visibleMembers.some((member) => !member.department_id) && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Some existing profiles have no department yet. Edit those profiles and assign a department to finish their setup.
          </p>
        )}
        {groupedMembers.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {error ? 'The team directory is unavailable.' : 'No team members match this filter.'}
          </section>
        ) : (
          <div className="min-w-0 space-y-5">
            {groupedMembers.map((group) => (
              <section key={group.name} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                  <h2 className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                    <Building2 size={17} className="shrink-0 text-blue-700" />
                    <span className="truncate">{group.name} Department</span>
                  </h2>
                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3 sm:px-5">Team member</th>
                        <th scope="col" className="px-4 py-3">Access type</th>
                        <th scope="col" className="px-4 py-3">Joined</th>
                        <th scope="col" className="px-4 py-3 text-right sm:px-5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 sm:px-5">
                            <button type="button" onClick={() => router.push(`/team/${member.id}`)} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                              <span className="block font-semibold text-slate-900">{member.full_name}</span>
                              <span className="block text-xs text-slate-500">{member.title || member.email}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-700">{member.role.replaceAll('_', ' ')}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {member.joining_date || member.joined_at
                              ? new Date(`${(member.joining_date || member.joined_at).slice(0, 10)}T12:00:00`).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <div className="inline-flex items-center justify-end gap-3">
                              <button type="button" onClick={() => router.push(`/team/${member.id}`)} className="text-xs font-medium text-blue-700 hover:text-blue-900">
                                View profile
                              </button>
                              {canManage && (
                                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label={`Edit ${member.full_name}`}
                                  onClick={() => {
                                    setDraft({
                                      id: member.id,
                                      email: member.email,
                                      full_name: member.full_name,
                                      role: member.role,
                                      department_id: member.department_id || departments.find((department) => department.name === member.department)?.id || '',
                                      title: member.title || '',
                                      joining_date: member.joining_date || '',
                                      supervisor_id: member.supervisor_id || '',
                                      phone: member.phone || '',
                                      bio: member.bio || '',
                                    });
                                    setError('');
                                    setModal('edit');
                                  }}>
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6">
            <h2 id="team-dialog-title" className="mb-4 text-lg font-semibold text-slate-900">{modal === 'add' ? 'Invite a team member' : 'Edit team member'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {modal === 'add' && <label className="text-xs font-medium text-slate-600">Email<input type="email" required autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>}
              <label className="text-xs font-medium text-slate-600">Full name<input required autoComplete="name" value={draft.full_name} onChange={(event) => setDraft({ ...draft, full_name: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Role / access type<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm">{roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
              <label className="text-xs font-medium text-slate-600">Department<select required value={draft.department_id} onChange={(event) => setDraft({ ...draft, department_id: event.target.value, supervisor_id: '' })} className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="" disabled>Select a department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
              <label className="text-xs font-medium text-slate-600">Position / title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600">Joining date<input type="date" value={draft.joining_date} onChange={(event) => setDraft({ ...draft, joining_date: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">Supervisor / department lead<select value={draft.supervisor_id} onChange={(event) => setDraft({ ...draft, supervisor_id: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="">Use the department lead</option>{members.filter((member) => member.is_active && member.id !== draft.id && (!draft.department_id || member.department_id === draft.department_id)).map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.department}</option>)}</select></label>
              {modal === 'edit' && <>
                <label className="text-xs font-medium text-slate-600">Phone<input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>
                <label className="text-xs font-medium text-slate-600">Bio<input value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input px-3 text-sm" /></label>
              </>}
            </div>
            {modal === 'add' && <p className="mt-3 text-xs text-slate-500">The user receives a secure email invitation and sets their own password.</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="h-10 rounded-lg border px-4 text-sm">Cancel</button>
              <button type="button" disabled={saving} onClick={() => void submit()} className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : modal === 'add' ? 'Send invitation' : 'Save changes'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
