'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/lib/database.types';
import { LayoutDashboard, Users, FolderKanban, MessageSquare, ChartBar as BarChart3, DollarSign, ClipboardList, UserCheck, Building2, LogOut, ChevronRight, Shield } from 'lucide-react';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','director','manager','developer','designer','qa','sales','hr','finance'] as Role[] },
  { href: '/team', label: 'Team', icon: Users, roles: ['admin','director','manager','hr'] as Role[] },
  { href: '/projects', label: 'Projects', icon: FolderKanban, roles: ['admin','director','manager','developer','designer','qa'] as Role[] },
  { href: '/customers', label: 'Customers', icon: Building2, roles: ['admin','director','manager','sales'] as Role[] },
  { href: '/messages', label: 'Messages', icon: MessageSquare, roles: ['admin','director','manager','developer','designer','qa','sales','hr','finance'] as Role[] },
  { href: '/accountability', label: 'Accountability', icon: ClipboardList, roles: ['admin','director','manager','developer','designer','qa','sales','hr','finance'] as Role[] },
  { href: '/finance', label: 'Finance', icon: DollarSign, roles: ['admin','director','finance','manager'] as Role[] },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin','director','manager','finance'] as Role[] },
  { href: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] as Role[] },
];

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
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const navItems = allNavItems.filter(item =>
    profile?.role ? item.roles.includes(profile.role as Role) : false
  );

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 flex flex-col z-30"
      style={{ background: 'hsl(220, 25%, 11%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Sybella Systems</p>
          <p className="text-blue-400 text-xs font-medium">VAC-P Platform</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-link', isActive && 'active')}
              style={{ color: isActive ? 'white' : 'hsl(215, 20%, 65%)' }}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{profile?.full_name || 'Loading...'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', profile?.role ? roleColors[profile.role] : 'bg-gray-500')} />
              <p className="text-xs capitalize" style={{ color: 'hsl(215, 15%, 55%)' }}>{profile?.role || ''}</p>
            </div>
          </div>
          <button
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
