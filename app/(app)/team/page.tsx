'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Role } from '@/lib/database.types';
import { UserPlus, Mail, Phone, MapPin, Shield, Search, MoveVertical as MoreVertical, CircleCheck as CheckCircle, Circle as XCircle, CreditCard as Edit2 } from 'lucide-react';

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
};

const departmentMap: Record<string, string> = {
  admin: 'Administration',
  director: 'Executive',
  manager: 'Management',
  developer: 'Engineering',
  designer: 'Design',
  qa: 'Quality Assurance',
  sales: 'Sales & Marketing',
  hr: 'Human Resources',
  finance: 'Finance',
};

const defaultMembers = [
  { full_name: 'Alice Uwimana', role: 'admin', department: 'Administration', email: 'alice@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Brian Nkurunziza', role: 'director', department: 'Executive', email: 'brian@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Christine Mukamana', role: 'manager', department: 'Management', email: 'christine@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'David Habimana', role: 'developer', department: 'Engineering', email: 'david@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Esther Ingabire', role: 'developer', department: 'Engineering', email: 'esther@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Frank Bizimana', role: 'designer', department: 'Design', email: 'frank@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Grace Uwase', role: 'qa', department: 'Quality Assurance', email: 'grace@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Henry Ndayishimiye', role: 'sales', department: 'Sales & Marketing', email: 'henry@sybellasystems.com', location: 'Kigali, Rwanda' },
  { full_name: 'Isabelle Mutesi', role: 'finance', department: 'Finance', email: 'isabelle@sybellasystems.com', location: 'Kigali, Rwanda' },
];

type ModalMode = 'add' | 'edit' | null;

export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode>(null);
  const [editMember, setEditMember] = useState<Partial<Profile> | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = profile?.role === 'admin' || profile?.role === 'director';

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setMembers((data as Profile[]) || []);
    setLoading(false);
  };

  const filtered = members.filter(m => {
    const matchSearch = m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!editMember?.full_name || !editMember?.email) return;
    setSaving(true);
    if (modal === 'edit' && editMember.id) {
      await supabase.from('profiles').update({
        full_name: editMember.full_name,
        role: editMember.role,
        department: editMember.department,
        phone: editMember.phone,
        bio: editMember.bio,
      }).eq('id', editMember.id);
    }
    await loadTeam();
    setSaving(false);
    setModal(null);
    setEditMember(null);
  };

  return (
    <div>
      <TopBar title="Team" subtitle="Sybella Systems — 9 Members" />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members..."
                className="pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary w-52"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-3 py-2 text-sm border border-input rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              {['admin','director','manager','developer','designer','qa','sales','hr','finance'].map(r => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </div>
          {canManage && (
            <button
              onClick={() => { setModal('add'); setEditMember({ role: 'developer', location: 'Kigali, Rwanda' }); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {['developer','manager','designer','qa','sales','hr'].map(role => {
            const count = members.filter(m => m.role === role).length;
            return (
              <div key={role} className="bg-white rounded-xl border border-border p-3 text-center">
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}s</p>
              </div>
            );
          })}
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(filtered.length > 0 ? filtered : defaultMembers).map((member: any) => (
              <div key={member.id || member.email} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">{initials(member.full_name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{member.full_name}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColors[member.role] || 'bg-gray-100 text-gray-600'}`}>
                      {member.role}
                    </span>
                  </div>
                  {canManage && member.id && (
                    <button
                      onClick={() => { setModal('edit'); setEditMember(member); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Edit2 size={13} className="text-muted-foreground" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={12} />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone size={12} />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={12} />
                    <span>{member.location || 'Kigali, Rwanda'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{member.department || departmentMap[member.role] || ''}</span>
                  <div className="flex items-center gap-1">
                    {member.is_active !== false ? (
                      <><CheckCircle size={13} className="text-emerald-500" /><span className="text-[11px] text-emerald-600 font-medium">Active</span></>
                    ) : (
                      <><XCircle size={13} className="text-red-500" /><span className="text-[11px] text-red-600 font-medium">Inactive</span></>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {modal === 'edit' && editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-foreground mb-4">Edit Team Member</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
                <input
                  value={editMember.full_name || ''}
                  onChange={e => setEditMember({ ...editMember, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
                <select
                  value={editMember.role || 'developer'}
                  onChange={e => setEditMember({ ...editMember, role: e.target.value as Role })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
                >
                  {['admin','director','manager','developer','designer','qa','sales','hr','finance'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
                <input
                  value={editMember.department || ''}
                  onChange={e => setEditMember({ ...editMember, department: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                <input
                  value={editMember.phone || ''}
                  onChange={e => setEditMember({ ...editMember, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Bio</label>
                <textarea
                  value={editMember.bio || ''}
                  onChange={e => setEditMember({ ...editMember, bio: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModal(null); setEditMember(null); }} className="flex-1 py-2 text-sm font-medium border border-input rounded-lg hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
