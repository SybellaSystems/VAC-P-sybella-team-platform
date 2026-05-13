'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Role } from '@/lib/database.types';
import { ALL_ROLES } from '@/lib/rbac';
import { UserPlus, Shield, Users, Mail, X, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  director: 'bg-amber-100 text-amber-700',
  manager: 'bg-blue-100 text-blue-700',
  developer: 'bg-emerald-100 text-emerald-700',
  designer: 'bg-pink-100 text-pink-700',
  qa: 'bg-orange-100 text-orange-700',
  sales: 'bg-teal-100 text-teal-700',
  hr: 'bg-violet-100 text-violet-700',
  finance: 'bg-cyan-100 text-cyan-700',
  legal_counsel: 'bg-slate-200 text-slate-800',
  marketing_manager: 'bg-fuchsia-100 text-fuchsia-800',
};
export default function AdminPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'developer', password: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    loadMembers();
  }, [isAdmin]);

  const loadMembers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setMembers((data as Profile[]) || []);
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.full_name || !inviteForm.password) {
      setError('Email, name, and password are required.');
      return;
    }
    setSaving(true);
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: inviteForm.password,
      options: {
        data: { full_name: inviteForm.full_name, role: inviteForm.role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(`Account created for ${inviteForm.full_name}. They can now sign in.`);
      setShowInvite(false);
      setInviteForm({ email: '', full_name: '', role: 'developer', password: '' });
      await loadMembers();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id);

    // Avoid updater-callback typing issues during build by refetching.
    await loadMembers();
  };

  const updateRole = async (id: string, role: Role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    await loadMembers();
  };

  if (!isAdmin) {
    return (
      <div>
        <TopBar title="Admin" subtitle="Restricted Area" />
        <div className="p-6 flex items-center justify-center min-h-64">
          <div className="text-center">
            <Shield size={40} className="text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-foreground font-semibold">Access Restricted</p>
            <p className="text-muted-foreground text-sm mt-1">Only administrators can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Admin Panel" subtitle="User management and system settings" />
      <div className="p-6 space-y-5">
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
            <CheckCircle size={16} />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total Members</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle size={18} className="text-emerald-600" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">{members.filter(m => m.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Shield size={18} className="text-red-600" /></div>
            <div>
              <p className="text-xl font-bold text-foreground">{members.filter(m => m.role === 'admin').length}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Team Members</h2>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90"
          >
            <UserPlus size={16} />
            Add Member
          </button>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Member</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? [...Array(4)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-4"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
              )) : members.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">No members yet. Start by adding the team.</td></tr>
              ) : members.map(member => (
                <tr key={member.id} className="hover:bg-muted/20">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="font-medium text-foreground text-sm">{member.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={member.role}
                      onChange={e => updateRole(member.id, e.target.value as Role)}
                      disabled={member.id === profile?.id}
                      className="text-xs border border-input rounded-lg px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${member.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {member.id !== profile?.id && (
                      <button
                        onClick={() => toggleActive(member.id, member.is_active)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${member.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {member.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">System Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            {[
              { label: 'Platform', value: 'VAC-P v1.0.0' },
              { label: 'Company', value: 'Sybella Systems Ltd' },
              { label: 'Location', value: 'Kigali, Rwanda' },
              { label: 'Database', value: 'Supabase (PostgreSQL)' },
              { label: 'Framework', value: 'Next.js 13 + TypeScript' },
              { label: 'Max Team Size', value: '100 members' },
              { label: 'Data Region', value: 'EU (Frankfurt)' },
              { label: 'Security', value: 'RLS + JWT Auth' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground mb-1">{label}</p>
                <p className="font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add New Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs mb-3">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
                <input value={inviteForm.full_name} onChange={e => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address *</label>
                <input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role *</label>
                <select value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary">
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Temporary Password *</label>
                <input type="password" value={inviteForm.password} onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={handleInvite} disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
