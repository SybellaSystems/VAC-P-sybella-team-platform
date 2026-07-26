'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Plus, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TopBarProps { title: string; subtitle?: string; }

interface SearchResult { id: string; type: 'project' | 'task' | 'customer' | 'person'; label: string; sub: string; href: string; }

export function TopBar({ title, subtitle }: TopBarProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    loadNotifications();
  }, [profile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    if (!profile) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  }

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    (async () => {
      const results: SearchResult[] = [];
      const [proj, tasks, custs, profs] = await Promise.all([
        supabase.from('projects').select('id,name,project_code,status').ilike('name', `%${q}%`).limit(5),
        supabase.from('tasks').select('id,title,project:projects!tasks_project_id_fkey(id,name)').ilike('title', `%${q}%`).limit(5),
        supabase.from('customers').select('id,name,company').ilike('name', `%${q}%`).limit(3),
        supabase.from('profiles').select('id,full_name,role').ilike('full_name', `%${q}%`).limit(3),
      ]);
      (proj.data || []).forEach((p: any) => results.push({ id: p.id, type: 'project', label: p.name, sub: p.project_code || p.status, href: `/projects/${p.id}` }));
      (tasks.data || []).forEach((t: any) => results.push({ id: t.id, type: 'task', label: t.title, sub: `Task in ${t.project?.name || ''}`, href: `/projects/${t.project?.id}` }));
      (custs.data || []).forEach((c: any) => results.push({ id: c.id, type: 'customer', label: c.name, sub: c.company || 'Customer', href: '/customers' }));
      (profs.data || []).forEach((p: any) => results.push({ id: p.id, type: 'person', label: p.full_name, sub: p.role, href: '/team' }));
      setSearchResults(results);
    })();
  }, [searchQuery]);

  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };
  const initials = profile?.full_name ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const typeIcon = (t: string) => t === 'project' ? 'P' : t === 'task' ? 'T' : t === 'customer' ? 'C' : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <div className="relative" ref={searchRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search projects, tasks, people..."
            className="pl-9 pr-4 py-1.5 text-sm bg-slate-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white w-64 transition-all"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-80 overflow-y-auto z-50">
              {searchResults.map(r => (
                <button key={r.id + r.type} onClick={() => { router.push(r.href); setShowSearch(false); setSearchQuery(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-bold">{typeIcon(r.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{r.label}</p><p className="text-xs text-slate-400 truncate">{r.sub}</p></div>
                </button>))}
            </div>)}
        </div>

        <button onClick={() => router.push('/projects/new')} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={14} /> New Project
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markAllRead(); }} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="absolute top-full mt-1 right-0 w-80 bg-white rounded-xl shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Notifications</p>
                {notifications.length > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No notifications</p>
              ) : (
                notifications.map(n => (
                  <button key={n.id} onClick={() => { if (n.link) router.push(n.link); setShowNotif(false); if (!n.is_read) markAsRead(n.id); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : n.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700">{n.title}</p><p className="text-xs text-slate-500 mt-0.5">{n.message}</p></div>
                    {!n.is_read && <Check size={14} className="text-slate-300 flex-shrink-0 mt-1" />}
                  </button>)))}
            </div>)}
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block"><p className="text-xs font-semibold text-slate-700">{greeting()},</p><p className="text-xs text-slate-500">{profile?.full_name?.split(' ')[0]}</p></div>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center"><span className="text-white text-xs font-bold">{initials}</span></div>
        </div>
      </div>
    </header>
  );
}
