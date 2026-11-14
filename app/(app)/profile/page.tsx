'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Save, UserRound } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    title: profile?.title || '',
    phone: profile?.phone || '',
    location: profile?.location || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const save = async () => {
    if (!profile || saving) return;
    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      title: form.title.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      bio: form.bio.trim(),
      avatar_url: form.avatar_url.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    if (saveError) {
      console.error('Unable to update profile:', saveError.message);
      setError(saveError.message);
    } else {
      await refreshProfile();
    }
    setSaving(false);
  };

  const eraseProfile = async () => {
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/profile/delete', {
      method: 'POST',
      headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {},
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || 'Unable to erase this profile.');
      return;
    }
    await signOut();
    router.replace('/login');
  };

  if (!profile) return null;

  return (
    <div>
      <TopBar title="Profile & settings" subtitle="Manage your personal information and account" />
      <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><UserRound className="text-blue-700" size={20} /><div><h2 className="font-semibold text-slate-900">Your profile</h2><p className="text-sm text-slate-500">Role and department access are managed by an administrator.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">Full name<input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} maxLength={160} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Position / title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={40} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={120} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">Profile image URL<input type="url" value={form.avatar_url} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} className="mt-1 h-10 w-full rounded-md border px-3 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">About you<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} maxLength={1000} className="mt-1 w-full rounded-md border p-3 text-sm" /></label>
            <div className="text-sm text-slate-600"><span className="text-xs font-medium text-slate-500">Email</span><p className="mt-1">{profile.email}</p></div>
            <div className="text-sm text-slate-600"><span className="text-xs font-medium text-slate-500">Department / role</span><p className="mt-1">{profile.department || 'Unassigned'} · {profile.role.replaceAll('_', ' ')}</p></div>
          </div>
          <div className="mt-5 flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={15} />{saving ? 'Saving...' : 'Save profile'}</button></div>
        </section>

        <section className="rounded-xl border border-red-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={19} className="mt-0.5 shrink-0 text-red-600" />
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">Erase personal information</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">This permanently anonymizes your profile and disables account access. Historical KPI reports, approvals, and audit records are retained with your name and contact details removed so organization records remain consistent.</p>
              {!showDelete ? <button type="button" onClick={() => setShowDelete(true)} className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Request profile erasure</button> : (
                <div className="mt-4 rounded-lg bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900">This action cannot be undone.</p>
                  <p className="mt-1 text-xs text-red-800">Personal profile fields are erased and your account is blocked. Historical accountability data remains de-identified.</p>
                  <div className="mt-3 flex gap-2"><button type="button" onClick={() => setShowDelete(false)} className="rounded-lg border bg-white px-3 py-2 text-sm">Cancel</button><button type="button" onClick={() => void eraseProfile()} className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white">Erase my profile</button></div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
