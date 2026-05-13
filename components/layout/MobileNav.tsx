'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { navItemsForRole, type NavItem } from '@/lib/rbac';
import type { Role } from '@/lib/database.types';
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
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
};

function NavIcon({ name }: { name: string }) {
  const C = ICON_MAP[name] || LayoutDashboard;
  return <C size={18} className="flex-shrink-0" />;
}

function linksFor(role: Role | undefined | null): NavItem[] {
  return navItemsForRole(role);
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useAuth();
  const items = linksFor(profile?.role as Role);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-white flex items-center px-3 gap-2 shadow-sm">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="p-2 rounded-lg border border-border bg-white text-foreground hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100%,280px)] p-0 flex flex-col bg-[hsl(220,25%,11%)] border-r-0 text-white">
          <SheetHeader className="p-4 border-b border-white/10 text-left">
            <SheetTitle className="text-white text-sm font-bold">VAC-P</SheetTitle>
            <p className="text-xs text-white/50 font-normal">Sybella Systems</p>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    isActive ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold text-foreground truncate">Menu</span>
    </div>
  );
}
