'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountabilityReport, Profile } from '@/lib/database.types';
import { Plus, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Clock, Eye, X, Flag } from 'lucide-react';

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  flagged: 'bg-red-100 text-red-700',
};

const emptyReport = (): Partial<AccountabilityReport> => ({
  report_type: 'daily',
  completed_tasks: '',
  planned_tasks: '',
  blockers: '',
  notes: '',
});

export default function AccountabilityPage() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<AccountabilityReport[]>([]);
  const [members, setMembers] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyReport());
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<AccountabilityReport | null>(null);
  const [filterMember, setFilterMember] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const canReview = ['admin','director','manager'].includes(profile?.role || '');

  useEffect(() => {
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    const [{ data: reps }, { data: profs }] = await Promise.all([
      supabase.from('accountability_reports').select('*').order('report_date', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
    ]);
    const profileMap: Record<string, Profile> = {};
    (profs as Profile[] || []).forEach(p => { profileMap[p.id] = p; });
    setMembers(profileMap);
    setReports((reps as AccountabilityReport[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.completed_tasks?.trim() || !profile) return;
    setSaving(true);
    await supabase.from('accountability_reports').insert({
      ...form,
      member_id: profile.id,
      report_date: new Date().toISOString().split('T')[0],
      status: 'submitted',
    });
    await loadAll();
    setSaving(false);
    setShowModal(false);
    setForm(emptyReport());
  };

  const handleReview = async (id: string, status: AccountabilityReport['status']) => {
    await supabase.from('accountability_reports').update({ status, reviewed_by: profile?.id }).eq('id', id);
    setReports((prev: AccountabilityReport[]) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) {
      setSelected((prev: AccountabilityReport | null) => (prev ? { ...prev, status } : null));
    }
  };

  const filtered = reports.filter(r => {
    const matchMember = filterMember === 'all' || r.member_id === filterMember;
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchMember && matchStatus;
  });

  const todayReports = reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]);
  const submittedCount = reports.filter(r => r.status === 'submitted').length;
  const flaggedCount = reports.filter(r => r.status === 'flagged').length;

  return (
    <div>
      <TopBar title="Accountability" subtitle="Daily reports and follow-ups" />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Reports', value: reports.length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: "Today's Reports", value: todayReports.length, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending Review', value: submittedCount, icon: Eye, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Flagged', value: flaggedCount, icon: Flag, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            {canReview && (
              <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
                className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All Members</option>
                {Object.values(members).map(m => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            )}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              {['submitted','reviewed','approved','flagged'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            Submit Report
          </button>
        </div>

        {/* Reports */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <CheckCircle size={36} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">No reports found</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-primary hover:underline">
              Submit your first report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(report => {
              const member = members[report.member_id];
              const isOwn = report.member_id === profile?.id;
              return (
                <div key={report.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {member?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{member?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{new Date(report.report_date).toLocaleDateString()}</p>
                          <span className="text-[10px] font-medium text-muted-foreground capitalize">{report.report_type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusColors[report.status]}`}>
                        {report.status}
                      </span>
                      <button
                        onClick={() => setSelected(report)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { label: 'Completed', value: report.completed_tasks, color: 'border-emerald-200 bg-emerald-50' },
                      { label: 'Planned', value: report.planned_tasks, color: 'border-blue-200 bg-blue-50' },
                      { label: 'Blockers', value: report.blockers, color: report.blockers ? 'border-red-200 bg-red-50' : 'border-border bg-muted/30' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`p-2.5 rounded-lg border ${color}`}>
                        <p className="font-semibold text-muted-foreground mb-1">{label}</p>
                        <p className="text-foreground line-clamp-2">{value || 'None'}</p>
                      </div>
                    ))}
                  </div>

                  {canReview && report.status === 'submitted' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mr-auto">Review action:</p>
                      <button onClick={() => handleReview(report.id, 'approved')}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => handleReview(report.id, 'flagged')}
                        className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                        Flag
                      </button>
                      <button onClick={() => handleReview(report.id, 'reviewed')}
                        className="px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors">
                        Mark Reviewed
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Submit Accountability Report</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Report Type</label>
                <div className="flex gap-2">
                  {['daily','weekly','monthly'].map(t => (
                    <button key={t}
                      onClick={() => setForm({ ...form, report_type: t as AccountabilityReport['report_type'] })}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all capitalize ${form.report_type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tasks Completed Today *</label>
                <textarea value={form.completed_tasks || ''} onChange={e => setForm({ ...form, completed_tasks: e.target.value })}
                  placeholder="List what you completed..."
                  rows={3} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Planned for Tomorrow</label>
                <textarea value={form.planned_tasks || ''} onChange={e => setForm({ ...form, planned_tasks: e.target.value })}
                  placeholder="List what you plan to work on..."
                  rows={3} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Blockers / Issues</label>
                <textarea value={form.blockers || ''} onChange={e => setForm({ ...form, blockers: e.target.value })}
                  placeholder="Any blockers or escalations?"
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Additional Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground">Report Details</h2>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold">
                  {members[selected.member_id]?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2) || '?'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{members[selected.member_id]?.full_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(selected.report_date).toLocaleDateString()} · {selected.report_type}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColors[selected.status]}`}>{selected.status}</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Completed Tasks', value: selected.completed_tasks, bg: 'bg-emerald-50' },
                { label: 'Planned Tasks', value: selected.planned_tasks, bg: 'bg-blue-50' },
                { label: 'Blockers', value: selected.blockers, bg: selected.blockers ? 'bg-red-50' : 'bg-muted/30' },
                { label: 'Notes', value: selected.notes, bg: 'bg-muted/30' },
              ].map(({ label, value, bg }) => (
                <div key={label} className={`p-3 rounded-lg ${bg}`}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm text-foreground">{value || 'None'}</p>
                </div>
              ))}
            </div>
            {canReview && (
              <div className="flex gap-2 mt-5">
                <button onClick={() => handleReview(selected.id, 'approved')}
                  className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve</button>
                <button onClick={() => handleReview(selected.id, 'flagged')}
                  className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Flag</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
