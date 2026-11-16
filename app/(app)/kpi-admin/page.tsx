'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isAdminProfile } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Save, ShieldAlert, Target, UserRound } from 'lucide-react';

type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  is_active: boolean;
};

type Kpi = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  unit: string;
  target: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  measurement_direction: 'higher' | 'lower' | 'binary';
  objective_id: string | null;
  proof_required: boolean;
  proof_type: string;
  active_from: string;
  active_until: string | null;
  is_active: boolean;
};

type Objective = { id: string; title: string; level: string; status: string };
type KpiDraft = Pick<Kpi, 'title' | 'description' | 'category' | 'unit' | 'target' | 'frequency' | 'measurement_direction' | 'objective_id' | 'proof_required' | 'proof_type'>;

const emptyDraft: KpiDraft = {
  title: '',
  description: '',
  category: 'Operations',
  unit: 'count',
  target: 1,
  frequency: 'daily',
  measurement_direction: 'higher',
  objective_id: null,
  proof_required: true,
  proof_type: 'URL',
};

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function KpiAdminPage() {
  const { profile } = useAuth();
  const canManage = isAdminProfile(profile);
  const [members, setMembers] = useState<Member[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [draft, setDraft] = useState<KpiDraft>(emptyDraft);
  const [edits, setEdits] = useState<Record<string, KpiDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const [memberResult, kpiResult, objectiveResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, department, is_active').order('full_name'),
      supabase.from('daily_kpis').select('*').order('created_at', { ascending: false }),
      supabase.from('objectives').select('id, title, level, status').eq('status', 'active').order('title'),
    ]);
    if (memberResult.error || kpiResult.error || objectiveResult.error) {
      const issue = memberResult.error || kpiResult.error || objectiveResult.error;
      const message = issue?.message || 'Failed to load KPI assignments.';
      console.error('Failed to load KPI assignments:', issue);
      setError(message);
      setLoading(false);
      return;
    }

    const activeMembers = ((memberResult.data || []) as Member[]).filter((member) => member.is_active);
    const allKpis = (kpiResult.data || []) as Kpi[];
    setMembers(activeMembers);
    setKpis(allKpis);
    setObjectives((objectiveResult.data || []) as Objective[]);
    setSelectedUserId((current) => current && activeMembers.some((member) => member.id === current) ? current : activeMembers[0]?.id || '');
    setEdits(Object.fromEntries(allKpis.map((kpi) => [kpi.id, {
      title: kpi.title,
      description: kpi.description || '',
      category: kpi.category || 'Operations',
      unit: kpi.unit,
      target: kpi.target,
      frequency: kpi.frequency,
      measurement_direction: kpi.measurement_direction || 'higher',
      objective_id: kpi.objective_id,
      proof_required: kpi.proof_required,
      proof_type: kpi.proof_type,
    }])));
    setLoading(false);
  }, [canManage]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedMember = members.find((member) => member.id === selectedUserId);
  const selectedKpis = useMemo(
    () => kpis.filter((kpi) => kpi.user_id === selectedUserId).sort((a, b) => a.title.localeCompare(b.title)),
    [kpis, selectedUserId]
  );

  const addKpi = async () => {
    if (!profile || !selectedUserId || saving) return;
    if (!draft.title.trim() || !draft.unit.trim() || !draft.category.trim() || (draft.proof_required && !draft.proof_type.trim())) {
      toast.error('KPI title, category, unit, and any required proof type are required.');
      return;
    }
    if (!Number.isFinite(Number(draft.target)) || Number(draft.target) < 0) {
      toast.error('Target must be a non-negative number.');
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from('daily_kpis').insert({
      user_id: selectedUserId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category.trim(),
      unit: draft.unit.trim(),
      target: Number(draft.target),
      frequency: draft.frequency,
      measurement_direction: draft.measurement_direction,
      objective_id: draft.objective_id,
      proof_required: draft.proof_required,
      proof_type: draft.proof_type.trim(),
      active_from: localDateString(new Date()),
      created_by: profile.id,
    });
    if (saveError) {
      console.error('Failed to assign KPI:', saveError);
      toast.error(saveError.message || 'Could not assign KPI.');
    } else {
      toast.success(`KPI assigned to ${selectedMember?.full_name || 'team member'}.`);
      setDraft(emptyDraft);
      await loadData();
    }
    setSaving(false);
  };

  const saveKpi = async (kpi: Kpi) => {
    const update = edits[kpi.id];
    if (!update || !update.title.trim() || !update.unit.trim() || !update.category.trim() || !Number.isFinite(Number(update.target)) || Number(update.target) < 0 || (update.proof_required && !update.proof_type.trim())) {
      toast.error('Enter a title, category, unit, required proof type, and non-negative target.');
      return;
    }
    const { error: saveError } = await supabase.from('daily_kpis').update({
      title: update.title.trim(),
      description: update.description.trim(),
      category: update.category.trim(),
      unit: update.unit.trim(),
      target: Number(update.target),
      frequency: update.frequency,
      measurement_direction: update.measurement_direction,
      objective_id: update.objective_id,
      proof_required: update.proof_required,
      proof_type: update.proof_type.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', kpi.id);
    if (saveError) {
      console.error('Failed to update KPI:', saveError);
      toast.error(saveError.message || 'Could not update KPI.');
    } else {
      toast.success('KPI updated.');
      await loadData();
    }
  };

  const toggleKpi = async (kpi: Kpi) => {
    const { error: saveError } = await supabase.from('daily_kpis').update({
      is_active: !kpi.is_active,
      active_until: kpi.is_active ? localDateString(new Date()) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', kpi.id);
    if (saveError) {
      console.error('Failed to update KPI status:', saveError);
      toast.error(saveError.message || 'Could not update KPI status.');
    } else {
      toast.success(kpi.is_active ? 'KPI deactivated.' : 'KPI reactivated.');
      await loadData();
    }
  };

  if (!canManage) {
    return (
      <div>
        <TopBar title="Set KPIs" subtitle="Administrator access required" />
        <div className="p-6">
          <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 text-slate-400" size={36} />
            <h1 className="font-semibold text-slate-900">Access restricted</h1>
            <p className="mt-1 text-sm text-slate-500">Only administrators and directors can assign or edit team KPIs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Set KPIs" subtitle="Assign measurable targets and proof requirements to each person" />
      <main className="space-y-5 p-4 sm:p-6">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <section className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,2fr)]">
          <div className="rounded-xl border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Team member</h2>
            </div>
            <label htmlFor="kpi-member" className="mb-1 block text-sm font-medium text-slate-600">Assign KPIs to</label>
            <select
              id="kpi-member"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              disabled={loading || members.length === 0}
            >
              {members.length === 0 && <option value="">No active users</option>}
              {members.map((member) => (
                <option key={member.id} value={member.id}>{member.full_name} · {member.department || 'No department'}</option>
              ))}
            </select>
            {selectedMember && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{selectedMember.full_name}</p>
                <p className="mt-1 text-slate-500">{selectedMember.role.replaceAll('_', ' ')} · {selectedMember.department || 'Department not set'}</p>
              </div>
            )}
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              Changes to targets apply to new daily entries. Submitted and approved entries remain unchanged for audit history.
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" />
              <h2 className="font-semibold text-slate-900">Assign a KPI</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="new-kpi-title" className="mb-1 block text-xs font-medium text-slate-600">KPI title</label>
                <Input id="new-kpi-title" value={draft.title} placeholder="e.g. Pull requests merged" onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={160} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="new-kpi-description" className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <Input id="new-kpi-description" value={draft.description} placeholder="What outcome does this measure?" onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={500} />
              </div>
              <div>
                <label htmlFor="new-kpi-category" className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                <Input id="new-kpi-category" value={draft.category} placeholder="Engineering, Sales..." onChange={(event) => setDraft({ ...draft, category: event.target.value })} maxLength={80} />
              </div>
              <div>
                <label htmlFor="new-kpi-unit" className="mb-1 block text-xs font-medium text-slate-600">Unit</label>
                <Input id="new-kpi-unit" value={draft.unit} placeholder="count, RWF, %" onChange={(event) => setDraft({ ...draft, unit: event.target.value })} maxLength={32} />
              </div>
              <div>
                <label htmlFor="new-kpi-target" className="mb-1 block text-xs font-medium text-slate-600">Target</label>
                <Input id="new-kpi-target" type="number" min="0" step="any" value={draft.target} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) })} />
              </div>
              <div>
                <label htmlFor="new-kpi-frequency" className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
                <select id="new-kpi-frequency" value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value as KpiDraft['frequency'] })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
                  <option value="daily">Per day</option>
                  <option value="weekly">Per week</option>
                  <option value="monthly">Per month</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-kpi-direction" className="mb-1 block text-xs font-medium text-slate-600">Success direction</label>
                <select id="new-kpi-direction" value={draft.measurement_direction} onChange={(event) => setDraft({ ...draft, measurement_direction: event.target.value as KpiDraft['measurement_direction'] })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
                  <option value="higher">Higher is better</option>
                  <option value="lower">Lower is better</option>
                  <option value="binary">Binary target</option>
                </select>
              </div>
              <div>
                <label htmlFor="new-kpi-objective" className="mb-1 block text-xs font-medium text-slate-600">Linked objective</label>
                <select id="new-kpi-objective" value={draft.objective_id || ''} onChange={(event) => setDraft({ ...draft, objective_id: event.target.value || null })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
                  <option value="">No linked objective</option>
                  {objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title} · {objective.level}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-kpi-proof" className="mb-1 block text-xs font-medium text-slate-600">Proof type</label>
                <Input id="new-kpi-proof" value={draft.proof_type} placeholder="GitHub, Drive, Email URL" onChange={(event) => setDraft({ ...draft, proof_type: event.target.value })} maxLength={80} />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" checked={draft.proof_required} onChange={(event) => setDraft({ ...draft, proof_required: event.target.checked })} />
                Require proof URL when submitting
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void addKpi()} disabled={!selectedUserId || saving || loading}>
                <Plus size={15} className="mr-2" /> Assign KPI
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b p-5">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-blue-600" />
              <div>
                <h2 className="font-semibold text-slate-900">Assigned KPIs</h2>
                <p className="text-sm text-slate-500">{selectedMember ? `${selectedMember.full_name} · ${selectedKpis.length} assigned` : 'Select a team member'}</p>
              </div>
            </div>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading KPI assignments...</p>
          ) : !selectedMember ? (
            <p className="p-8 text-center text-sm text-slate-500">No active team members available.</p>
          ) : selectedKpis.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No KPIs assigned yet.</p>
          ) : (
            <div className="divide-y">
              {selectedKpis.map((kpi) => {
                const edit = edits[kpi.id];
                if (!edit) return null;
                return (
                  <div key={kpi.id} className={`grid gap-3 p-5 ${kpi.is_active ? '' : 'bg-slate-50 opacity-70'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge className={kpi.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}>{kpi.is_active ? 'Active' : 'Inactive'}</Badge>
                      <span className="text-xs text-slate-500">From {kpi.active_from}{kpi.active_until ? ` · Through ${kpi.active_until}` : ''}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="lg:col-span-2">
                        <label htmlFor={`title-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">KPI</label>
                        <Input id={`title-${kpi.id}`} value={edit.title} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, title: event.target.value } })} />
                      </div>
                      <div className="sm:col-span-2 lg:col-span-4">
                        <label htmlFor={`description-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                        <Textarea id={`description-${kpi.id}`} value={edit.description} disabled={!kpi.is_active} maxLength={500} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, description: event.target.value } })} rows={2} />
                      </div>
                      <div>
                        <label htmlFor={`unit-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Unit</label>
                        <Input id={`unit-${kpi.id}`} value={edit.unit} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, unit: event.target.value } })} />
                      </div>
                      <div>
                        <label htmlFor={`target-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Target / {edit.frequency}</label>
                        <Input id={`target-${kpi.id}`} type="number" min="0" step="any" value={edit.target} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, target: Number(event.target.value) } })} />
                      </div>
                      <div>
                        <label htmlFor={`direction-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Success direction</label>
                        <select id={`direction-${kpi.id}`} value={edit.measurement_direction} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, measurement_direction: event.target.value as KpiDraft['measurement_direction'] } })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-50">
                          <option value="higher">Higher is better</option><option value="lower">Lower is better</option><option value="binary">Binary target</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`category-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                        <Input id={`category-${kpi.id}`} value={edit.category} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, category: event.target.value } })} />
                      </div>
                      <div>
                        <label htmlFor={`objective-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Linked objective</label>
                        <select id={`objective-${kpi.id}`} value={edit.objective_id || ''} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, objective_id: event.target.value || null } })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-50">
                          <option value="">No linked objective</option>
                          {objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`frequency-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
                        <select id={`frequency-${kpi.id}`} value={edit.frequency} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, frequency: event.target.value as KpiDraft['frequency'] } })} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-50">
                          <option value="daily">Per day</option><option value="weekly">Per week</option><option value="monthly">Per month</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`proof-${kpi.id}`} className="mb-1 block text-xs font-medium text-slate-600">Proof type</label>
                        <Input id={`proof-${kpi.id}`} value={edit.proof_type} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, proof_type: event.target.value } })} />
                      </div>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                        <input type="checkbox" checked={edit.proof_required} disabled={!kpi.is_active} onChange={(event) => setEdits({ ...edits, [kpi.id]: { ...edit, proof_required: event.target.checked } })} />
                        Proof required
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      {kpi.is_active && <Button variant="outline" size="sm" onClick={() => void saveKpi(kpi)}><Save size={14} className="mr-2" /> Save changes</Button>}
                      <Button variant="outline" size="sm" onClick={() => void toggleKpi(kpi)}>{kpi.is_active ? 'Deactivate' : 'Reactivate'}</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
