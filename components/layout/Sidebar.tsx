'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { navItemsForRole, type NavItem } from '@/lib/rbac';
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
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const navItems = navItemsForRole(profile?.role as Role);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-30"
      style={{ background: 'hsl(220, 25%, 11%)' }}
    >
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Sybella Systems</p>
          <p className="text-blue-400 text-xs font-medium">VAC-P Platform</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map((item: NavItem) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
              style={{ color: isActive ? 'white' : 'hsl(215, 20%, 65%)' }}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{profile?.full_name || 'Loading...'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', profile?.role ? roleColors[profile.role as Role] : 'bg-gray-500')} />
              <p className="text-xs capitalize" style={{ color: 'hsl(215, 15%, 55%)' }}>
                {(profile?.role || '').replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogOut size={14} style={{ color: 'hsl(215, 15%, 55%)' }} />
          </button>
        </div>
      </div>
    </aside>
  );
}
