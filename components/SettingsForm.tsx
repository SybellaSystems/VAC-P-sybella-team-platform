'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function SettingsForm() {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    avatar_url: '',
    department: '',
    phone: '',
    location: '',
    bio: '',
    notification_browser: true,
    notification_email: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      full_name: profile.full_name || '',
      email: profile.email || '',
      avatar_url: profile.avatar_url || '',
      department: profile.department || '',
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
      notification_browser: profile.notification_preferences?.browser ?? true,
      notification_email: profile.notification_preferences?.email ?? true,
    }));
  }, [profile]);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!profile) return toast({ title: 'Not signed in', description: 'Sign in to save settings.' });
    setSaving(true);
    try {
      const payload: any = {
        full_name: form.full_name,
        avatar_url: form.avatar_url,
        department: form.department,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
        notification_preferences: {
          browser: !!form.notification_browser,
          email: !!form.notification_email,
        },
      };

      const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);
      if (error) throw error;
      toast({ title: 'Saved', description: 'Your profile settings have been updated.' });
    } catch (err: any) {
      toast({ title: 'Could not save', description: err?.message ?? String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-3xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Full name</label>
          <input className="w-full p-2 border rounded" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="w-full p-2 border rounded bg-gray-50" value={form.email} readOnly />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input className="w-full p-2 border rounded" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Department</label>
          <input className="w-full p-2 border rounded" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Location</label>
        <input className="w-full p-2 border rounded" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>

      <div>
        <label className="block text-sm mb-1">Bio</label>
        <textarea className="w-full p-2 border rounded" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>

      <div className="flex gap-6 items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.notification_browser} onChange={(e) => setForm({ ...form, notification_browser: e.target.checked })} />
          <span className="text-sm">Browser notifications</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.checked })} />
          <span className="text-sm">Email notifications</span>
        </label>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}
