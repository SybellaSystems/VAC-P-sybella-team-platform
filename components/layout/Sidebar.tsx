'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { navSectionsForRole, type NavSection } from '@/lib/rbac';
import type { Role } from '@/lib/database.types';
import { LogOut, ChevronRight } from 'lucide-react';
import { LayoutDashboard, Briefcase, SquareCheck as CheckSquare, FolderKanban, LayoutGrid, Building2, TrendingUp, MessageSquare, ClipboardList, DollarSign, Landmark, ChartBar as BarChart3, Users, HeartPulse, Scale, Megaphone, BookOpen, Link2, CalendarRange, Wallet, ChartPie as PieChart, ScrollText, Shield, Bell } from 'lucide-react';

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
  const sections = navSectionsForRole(profile?.role);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-30 bg-[#0f172a] text-white">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Sybella Systems</p>
          <p className="text-blue-400 text-[10px] font-semibold tracking-wide uppercase">VAC-P Platform</p>
        </div>
      </div>

      <nav aria-label="Primary navigation" className="sidebar-scroll flex-1 px-3 py-4 overflow-y-auto space-y-4">
        {sections.map((section: NavSection) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[10px] uppercase tracking-[0.18em] text-slate-500 font-semibold">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto text-white/70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-white">{profile?.full_name || 'Loading...'}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className={cn('h-1.5 w-1.5 rounded-full', profile?.role ? roleColors[profile.role as Role] : 'bg-slate-500')} />
              <span className="capitalize">{(profile?.role || '').replace('_', ' ')}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
