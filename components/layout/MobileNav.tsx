'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { navSectionsForRole, type NavSection } from '@/lib/rbac';
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
  Bell,
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
  Bell,
};

function NavIcon({ name }: { name: string }) {
  const C = ICON_MAP[name] || LayoutDashboard;
  return <C size={18} className="flex-shrink-0" />;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile } = useAuth();
  const { prefs, setPref } = useUiPreferences();
  const sections = navSectionsForRole(profile?.role);

  useEffect(() => {
    if (typeof prefs.mobileNavOpen === 'boolean') {
      setOpen(prefs.mobileNavOpen);
    }
  }, [prefs.mobileNavOpen]);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b border-border bg-white flex items-center px-3 gap-2 shadow-sm">
      <Sheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setPref('mobileNavOpen', next);
        }}
      >
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
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {sections.map((section: NavSection) => (
              <div key={section.title} className="space-y-2">
                <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium',
                          isActive ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <NavIcon name={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <span className="text-sm font-semibold text-foreground truncate">Menu</span>
    </div>
  );
}
