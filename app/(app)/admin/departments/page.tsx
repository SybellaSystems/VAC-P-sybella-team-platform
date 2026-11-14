'use client';

import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { SybellaLoadingState } from '@/components/ui/SybellaLoadingState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Department = { id: string; name: string; category: string; lead_user_id: string | null };
type Member = { id: string; full_name: string; department_id: string | null; is_active: boolean };

const categories = ['executive', 'marketing', 'technical', 'legal', 'project', 'product', 'operations', 'finance', 'people'];

export default function DepartmentsAdminPage() {
  const { profile } = useAuth();
  const canManage = profile?.role === 'admin' || profile?.role === 'director';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('technical');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setError('');
    const [departmentResult, memberResult] = await Promise.all([
      supabase.from('departments').select('id, name, category, lead_user_id').order('name'),
      supabase.from('profiles').select('id, full_name, department_id, is_active').eq('is_active', true).order('full_name'),
    ]);
    if (departmentResult.error || memberResult.error) {
      const issue = departmentResult.error || memberResult.error;
      console.error('Unable to load department settings:', issue?.message);
      setError(issue?.message || 'Unable to load department settings.');
    } else {
      setDepartments((departmentResult.data || []) as Department[]);
      setMembers((memberResult.data || []) as Member[]);
    }
    setLoading(false);
  }, [canManage]);

  useEffect(() => { void loadData(); }, [loadData]);

  const createDepartment = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const { error: insertError } = await supabase.from('departments').insert({ name: name.trim(), category });
    if (insertError) {
      console.error('Unable to create department:', insertError.message);
      setError(insertError.message);
    } else {
      setName('');
      await loadData();
    }
    setSaving(false);
  };

  const assignLead = async (departmentId: string, leadUserId: string) => {
    const department = departments.find((item) => item.id === departmentId);
    const lead = members.find((item) => item.id === leadUserId);
    if (leadUserId && lead?.department_id !== departmentId) {
      setError('The department lead must be assigned to this department first.');
      return;
    }
    const { error: updateError } = await supabase.from('departments')
      .update({ lead_user_id: leadUserId || null, updated_at: new Date().toISOString() })
      .eq('id', departmentId);
    if (updateError) {
      console.error('Unable to assign department lead:', updateError.message);
      setError(updateError.message);
    } else {
      setDepartments((current) => current.map((item) => item.id === departmentId ? { ...item, lead_user_id: leadUserId || null } : item));
      setError('');
    }
    void department;
  };

  if (!canManage) return <div><TopBar title="Departments" subtitle="Administrator access required" /><p className="p-6 text-sm text-slate-600">Only administrators and directors can manage departments.</p></div>;
  if (loading) return <div><TopBar title="Departments" subtitle="Loading department settings" /><SybellaLoadingState text="Loading departments" /></div>;

  return (
    <div>
      <TopBar title="Departments" subtitle="Create departments and assign the people who verify their daily reports" />
      <main className="space-y-5 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Add a department</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <label className="text-xs font-medium text-slate-600">Department name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="e.g. Technical" className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button type="button" disabled={!name.trim() || saving} onClick={() => void createDepartment()} className="self-end rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Create department'}</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b p-5"><h2 className="font-semibold text-slate-900">Department leads</h2><p className="mt-1 text-sm text-slate-500">A department lead receives new report-verification requests for their members.</p></div>
          <div className="divide-y">
            {departments.map((department) => (
              <div key={department.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_280px] sm:items-center">
                <div><p className="font-medium text-slate-900">{department.name}</p><p className="text-xs capitalize text-slate-500">{department.category}</p></div>
                <label className="text-xs font-medium text-slate-600">
                  <span className="sr-only">Lead for {department.name}</span>
                  <select value={department.lead_user_id || ''} onChange={(event) => void assignLead(department.id, event.target.value)} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                    <option value="">No lead assigned</option>
                    {members.filter((member) => member.department_id === department.id).map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}
                  </select>
                </label>
              </div>
            ))}
            {departments.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No departments yet. Create one above.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
