'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { navSectionsForRole, type NavSection } from '@/lib/rbac';
import type { Role } from '@/lib/database.types';
import { LogOut, ChevronRight } from 'lucide-react';
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  Building2,
  TrendingUp,
  MessageSquare,
  ClipboardList,
  DollarSign,
  Landmark,
  ChartBar as BarChart3,
  Users,
  HeartPulse,
  Scale,
  Megaphone,
  BookOpen,
  Link2,
  CalendarRange,
  Wallet,
  PieChart,
  ScrollText,
  Shield,
  Bell,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  Building2,
  TrendingUp,
  MessageSquare,
  ClipboardList,
  DollarSign,
  Landmark,
  BarChart3,
  Users,
  HeartPulse,
  Scale,
  Megaphone,
  BookOpen,
  Link2,
  CalendarRange,
  Wallet,
  PieChart,
  ScrollText,
  Shield,
  Bell,
};

function NavIcon({ name }: { name: string }) {
  const C = ICON_MAP[name] || LayoutDashboard;
  return <C size={18} className="flex-shrink-0" />;
}

const roleColors: Record<Role, string> = {
  admin: 'bg-red-500',
  director: 'bg-amber-500',
  manager: 'bg-blue-500',
  developer: 'bg-emerald-500',
  designer: 'bg-pink-500',
  qa: 'bg-orange-500',
  sales: 'bg-teal-500',
  hr: 'bg-violet-500',
  finance: 'bg-cyan-500',
  legal_counsel: 'bg-slate-400',
  marketing_manager: 'bg-fuchsia-500',
  customer_support: 'bg-lime-500',
  operations: 'bg-sky-500',
  ceo: 'bg-amber-400',
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { prefs, setPref } = useUiPreferences();
  const sections = navSectionsForRole(profile?.role);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const settingsOpen = !!prefs.settingsOpen;
  const collapsedSections = prefs.collapsedSections ?? {};

  const toggleSettings = () => {
    setPref('settingsOpen', !settingsOpen);
  };

  const toggleSection = (title: string) => {
    setPref('collapsedSections', {
      ...collapsedSections,
      [title]: !collapsedSections[title],
    });
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-72 flex-col z-30 bg-slate-950 text-white">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Sybella Systems</p>
          <p className="text-blue-300 text-xs font-medium">VAC-P Operations</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-4 py-4 overflow-y-auto space-y-5">
        {sections.map((section: NavSection) => {
          const sectionCollapsed = !!collapsedSections[section.title];
          return (
            <div key={section.title} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-500 hover:text-white hover:bg-slate-900 rounded-2xl transition-colors"
              >
                <span>{section.title}</span>
                <ChevronRight
                  size={14}
                  className={cn(
                    'transition-transform',
                    sectionCollapsed ? 'rotate-0' : 'rotate-90'
                  )}
                />
              </button>
              <div className={cn('space-y-1', sectionCollapsed && 'hidden')}>
              {section.items.map((item) => {
                // Make Settings expandable to show workspace settings for admins
                if (item.href === '/settings') {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const isAdmin = !!profile?.role && ['admin', 'owner'].includes(profile.role as string);
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        onClick={toggleSettings}
                        className={cn(
                          'group w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors text-left',
                          isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        )}
                      >
                        <NavIcon name={item.icon} />
                        <span>{item.label}</span>
                        <ChevronRight size={14} className={cn('ml-auto transition-transform', settingsOpen ? 'rotate-90' : '')} />
                      </button>

                      {settingsOpen && (
                        <div className="mt-2 ml-8 space-y-1">
                          <Link href="/settings" className="block text-slate-300 hover:text-white text-sm">Profile settings</Link>
                          {isAdmin && (
                            <Link href="/settings/workspace" className="block text-slate-300 hover:text-white text-sm">Workspace settings</Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    )}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-slate-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      <div className="px-4 pb-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{profile?.full_name || 'Loading...'}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className={cn('h-2.5 w-2.5 rounded-full', profile?.role ? roleColors[profile.role as Role] : 'bg-slate-500')} />
              <span className="capitalize">{(profile?.role || '').replace('_', ' ')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
