'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Building2, ExternalLink, LogOut, Settings2 } from 'lucide-react';

type PlatformAccount = {
  id: string;
  platform_name: string;
  login_url: string;
};

function initials(name: string | undefined): string {
  return name?.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function ActivityTracker() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile?.is_active || profile.role === 'deleted') return;
    const storageKey = 'vacp-activity-session';
    const existing = window.sessionStorage.getItem(storageKey);
    const sessionKey = existing || window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, sessionKey);

    const sendHeartbeat = async () => {
      const { error } = await supabase.rpc('vacp_heartbeat_activity', { p_session_key: sessionKey });
      if (error) console.error('Unable to record VAC-P activity heartbeat:', error.message);
    };

    void sendHeartbeat();
    const intervalId = window.setInterval(() => void sendHeartbeat(), 60_000);
    return () => window.clearInterval(intervalId);
  }, [user, profile?.is_active, profile?.role]);

  return null;
}

function PlatformDock() {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    supabase.from('platform_accounts').select('id, platform_name, login_url').eq('is_active', true).order('platform_name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Unable to load platform links:', error.message);
          return;
        }
        if (active) setAccounts((data || []) as PlatformAccount[]);
      });
    return () => { active = false; };
  }, [profile?.id, profile?.department_id]);

  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2" aria-label="Approved department platform links">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Systems</span>
          {accounts.map((account) => (
            <a
              key={account.id}
              href={account.login_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${account.platform_name}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[9px] font-bold text-slate-600">
                {account.platform_name.slice(0, 2).toUpperCase()}
              </span>
              {account.platform_name}
              <ExternalLink size={11} className="text-slate-400" />
            </a>
          ))}
          {accounts.length === 0 && <span className="text-xs text-slate-400">No approved systems for your access.</span>}
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Sybella Systems Ltd · VAC-P V3</p>
      </div>
    </footer>
  );
}

export function WorkspaceChrome({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const joined = useMemo(() => profile?.joining_date || profile?.joined_at?.slice(0, 10), [profile?.joining_date, profile?.joined_at]);

  return (
    <div className="min-h-screen bg-slate-50">
      <ActivityTracker />
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(profile?.full_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{profile?.full_name || 'Team member'}</p>
              <p className="truncate text-xs text-slate-500">{profile?.title || profile?.role?.replaceAll('_', ' ') || 'Team member'} · {profile?.department || 'Department not assigned'}</p>
              <p className="text-[11px] text-slate-500">{joined ? `Joined ${new Date(`${joined}T12:00:00`).toLocaleDateString()}` : 'Joining date not set'}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">VAC-P V3</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
            <div className="flex items-center gap-2 text-right">
              <Building2 size={20} className="hidden text-slate-500 sm:block" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Sybella Systems Ltd</p>
                <p className="text-[11px] text-slate-500">Integrations &amp; Systems Engineering · Rulindo, Rwanda</p>
                <p className="text-[11px] text-slate-500">
                  <a className="hover:text-blue-700" href="mailto:info@sybellasystems.co.rw">info@sybellasystems.co.rw</a>
                  <span className="mx-1.5">·</span>
                  <a className="hover:text-blue-700" href="tel:+250723776020">+250 723 776 020</a>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              <Link href="/profile" aria-label="Settings and profile" title="Settings and profile" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <Settings2 size={18} />
              </Link>
              <button type="button" onClick={() => void signOut()} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>
      {children}
      <PlatformDock />
    </div>
  );
}
