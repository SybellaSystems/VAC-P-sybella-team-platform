import type { Role } from '@/lib/database.types';

export const ALL_ROLES: Role[] = [
  'admin',
  'director',
  'manager',
  'developer',
  'designer',
  'qa',
  'sales',
  'hr',
  'finance',
  'legal_counsel',
  'marketing_manager',
];

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
};

/** Central navigation: filtered by role in Sidebar */
export const NAV_CONFIG: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ALL_ROLES },
  { href: '/my-work', label: 'My work', icon: 'Briefcase', roles: ['developer', 'designer', 'qa'] },
  { href: '/approvals', label: 'Approvals', icon: 'CheckSquare', roles: ['admin', 'director', 'hr', 'manager', 'finance'] },
  { href: '/projects', label: 'Projects', icon: 'FolderKanban', roles: ['admin', 'director', 'manager', 'developer', 'designer', 'qa', 'marketing_manager'] },
  { href: '/project-office', label: 'Project office', icon: 'LayoutGrid', roles: ['manager'] },
  { href: '/customers', label: 'Customers', icon: 'Building2', roles: ['admin', 'director', 'manager', 'sales', 'marketing_manager'] },
  { href: '/sales-pipeline', label: 'Sales pipeline', icon: 'TrendingUp', roles: ['sales', 'admin', 'director', 'marketing_manager'] },
  { href: '/messages', label: 'Messages', icon: 'MessageSquare', roles: ALL_ROLES },
  { href: '/accountability', label: 'Accountability', icon: 'ClipboardList', roles: ALL_ROLES },
  { href: '/finance', label: 'Finance', icon: 'DollarSign', roles: ['admin', 'director', 'finance', 'manager'] },
  { href: '/finance-console', label: 'Finance console', icon: 'Landmark', roles: ['finance', 'admin', 'director'] },
  { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['admin', 'director', 'manager', 'finance', 'marketing_manager'] },
  { href: '/team', label: 'Team', icon: 'Users', roles: ['admin', 'director', 'manager', 'hr'] },
  { href: '/hr', label: 'HR hub', icon: 'HeartPulse', roles: ['hr', 'admin', 'director'] },
  { href: '/legal', label: 'Legal', icon: 'Scale', roles: ['legal_counsel', 'admin', 'director'] },
  { href: '/marketing', label: 'Marketing', icon: 'Megaphone', roles: ['marketing_manager', 'admin', 'director', 'sales'] },
  { href: '/wiki', label: 'Wiki', icon: 'BookOpen', roles: ALL_ROLES },
  { href: '/repo-links', label: 'Repo links', icon: 'Link2', roles: ALL_ROLES },
  { href: '/leave', label: 'Leave', icon: 'CalendarRange', roles: ALL_ROLES },
  { href: '/budget', label: 'Budgets', icon: 'Wallet', roles: ['admin', 'director', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'finance'] },
  {
    href: '/shares',
    label: 'Shares',
    icon: 'PieChart',
    roles: ['admin', 'director', 'finance', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'legal_counsel', 'marketing_manager'],
  },
  { href: '/audit-logs', label: 'Audit logs', icon: 'ScrollText', roles: ['admin', 'director'] },
  { href: '/admin', label: 'Admin', icon: 'Shield', roles: ['admin'] },
];

export function navItemsForRole(role: Role | undefined | null): NavItem[] {
  if (!role) return [];
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const item of NAV_CONFIG) {
    if (!item.roles.includes(role)) continue;
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    out.push(item);
  }
  return out;
}

export function canManageShares(role: Role | null | undefined): boolean {
  return role === 'admin';
}

export function canApproveLeave(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'hr', 'manager'].includes(role);
}

export function canEditWiki(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel'].includes(role);
}

export function canViewAllLeave(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'hr', 'manager', 'finance'].includes(role);
}
