'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TopBarProps { title: string; subtitle?: string; }

interface SearchResult { id: string; type: 'person' | 'objective' | 'kpi'; label: string; sub: string; href: string; }

export function TopBar({ title, subtitle }: TopBarProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
    if (error) {
      console.error('Unable to load notifications:', error.message);
      return;
    }
    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  }, [profile]);

  useEffect(() => {
    if (profile) void loadNotifications();
  }, [loadNotifications, profile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      console.error('Unable to mark notification as read:', error.message);
      return;
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    if (!profile) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
    if (error) {
      console.error('Unable to mark notifications as read:', error.message);
      return;
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); setSearchError(''); return; }
    const q = searchQuery.toLowerCase();
    let active = true;
    (async () => {
      const [people, objectives, kpis] = await Promise.all([
        supabase.from('profiles').select('id,full_name,title,department').ilike('full_name', `%${q}%`).limit(5),
        supabase.from('objectives').select('id,title,level,department').ilike('title', `%${q}%`).limit(5),
        supabase.from('daily_kpis').select('id,title,unit,frequency').ilike('title', `%${q}%`).limit(5),
      ]);
      const queryError = people.error || objectives.error || kpis.error;
      if (queryError) {
        console.error('Unable to search VAC-P data:', queryError.message);
        if (active) {
          setSearchError('Search is temporarily unavailable.');
          setSearchResults([]);
        }
        return;
      }
      if (!active) return;
      const results: SearchResult[] = [];
      (people.data || []).forEach((person) => results.push({
        id: person.id,
        type: 'person',
        label: person.full_name,
        sub: [person.title, person.department].filter(Boolean).join(' · ') || 'Team member',
        href: '/team',
      }));
      (objectives.data || []).forEach((objective) => results.push({
        id: objective.id,
        type: 'objective',
        label: objective.title,
        sub: [objective.level, objective.department].filter(Boolean).join(' · '),
        href: '/goals',
      }));
      (kpis.data || []).forEach((kpi) => results.push({
        id: kpi.id,
        type: 'kpi',
        label: kpi.title,
        sub: `${kpi.unit} · ${kpi.frequency}`,
        href: '/analytics',
      }));
      setSearchError('');
      setSearchResults(results);
    })();
    return () => { active = false; };
  }, [searchQuery]);

  const greeting = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };
  const typeIcon = (t: string) => t === 'objective' ? 'O' : t === 'kpi' ? 'K' : 'P';
  const initials = profile?.full_name
    ? profile.full_name.split(/\s+/).filter(Boolean).map((name) => name[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Global Search */}
        <div className="relative" ref={searchRef}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search..."
            className="pl-9 pr-3 py-1.5 text-sm bg-slate-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white w-32 sm:w-48 md:w-64 transition-all"
          />
          {showSearch && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-80 overflow-y-auto z-50">
              {searchError ? <p role="alert" className="px-4 py-3 text-sm text-red-700">{searchError}</p> : searchResults.length === 0 ? <p className="px-4 py-3 text-sm text-slate-500">No matching people, objectives, or KPIs.</p> : searchResults.map(r => (
                <button key={r.id + r.type} onClick={() => { router.push(r.href); setShowSearch(false); setSearchQuery(''); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xs font-bold">{typeIcon(r.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-700 truncate">{r.label}</p><p className="text-xs text-slate-400 truncate">{r.sub}</p></div>
                </button>))}
            </div>)}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowNotif(!showNotif); if (!showNotif && unreadCount > 0) markAllRead(); }} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="absolute top-full mt-1 right-0 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-200 max-h-96 overflow-y-auto z-50">
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

        <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l border-slate-200">
          <div className="text-right hidden md:block"><p className="text-xs font-semibold text-slate-700">{greeting()},</p><p className="text-xs text-slate-500">{profile?.full_name?.split(' ')[0]}</p></div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs font-bold">{initials}</span></div>
        </div>
      </div>
    </header>
  );
}
