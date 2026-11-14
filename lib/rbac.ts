import type { Profile, Role } from '@/lib/database.types';

export const ALL_ROLES: Role[] = [
  'admin', 'director', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr',
  'finance', 'legal_counsel', 'marketing_manager', 'customer_support', 'operations',
  'ceo', 'intern', 'partner', 'executive', 'marketing', 'technical', 'legal',
  'project', 'product',
];

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  departments?: string[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const ALL: Role[] = ALL_ROLES;
const ADMINS: Role[] = ['admin', 'director'];
const EMPLOYEES: Role[] = ALL.filter((role) => role !== 'partner');
const LEADS: Role[] = ['admin', 'director', 'manager', 'marketing_manager', 'hr', 'legal_counsel'];

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ALL },
      { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ALL },
      { href: '/team', label: 'People', icon: 'Users', roles: [...ADMINS, 'manager', 'hr', 'intern', 'developer', 'designer', 'qa', 'sales', 'marketing_manager', 'legal_counsel', 'operations', 'executive', 'marketing', 'technical', 'legal', 'project', 'product'] },
    ],
  },
  {
    title: 'Daily work',
    items: [
      { href: '/daily-progress', label: 'My KPI report', icon: 'ClipboardList', roles: EMPLOYEES },
      { href: '/daily-approvals', label: 'Report approvals', icon: 'CheckSquare', roles: LEADS },
      { href: '/check-in', label: 'Check-in / out', icon: 'Clock', roles: EMPLOYEES },
      { href: '/my-work', label: 'My work', icon: 'Briefcase', roles: ['developer', 'designer', 'qa', 'intern', 'technical', 'product'] },
      { href: '/messages', label: 'Messages', icon: 'MessageSquare', roles: ALL },
      { href: '/notifications', label: 'Inbox', icon: 'Bell', roles: ALL },
    ],
  },
  {
    title: 'Departments & projects',
    items: [
      { href: '/projects', label: 'Projects', icon: 'FolderKanban', roles: ALL },
      { href: '/project-office', label: 'Project office', icon: 'LayoutGrid', roles: [...ADMINS, 'manager', 'project'] },
      { href: '/customers', label: 'Customers', icon: 'Building2', roles: [...ADMINS, 'manager', 'sales', 'marketing_manager', 'marketing'] },
      { href: '/sales-pipeline', label: 'Sales & leads', icon: 'TrendingUp', roles: [...ADMINS, 'sales', 'marketing_manager', 'marketing'] },
      { href: '/drive', label: 'Department folders', icon: 'FolderOpen', roles: ALL },
      { href: '/wiki', label: 'Knowledge base', icon: 'BookOpen', roles: ALL },
    ],
  },
  {
    title: 'Planning',
    items: [
      { href: '/goals', label: 'Goals & OKRs', icon: 'Target', roles: [...ADMINS, 'ceo', 'manager', 'hr', 'executive'] },
      { href: '/kpi-admin', label: 'Set KPIs', icon: 'Target', roles: ADMINS },
      { href: '/accountability', label: 'Legacy reports', icon: 'FileText', roles: ADMINS },
      { href: '/meetings', label: 'Meetings', icon: 'Calendar', roles: EMPLOYEES },
      { href: '/recognition', label: 'Recognition', icon: 'Trophy', roles: EMPLOYEES },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin', label: 'Users & departments', icon: 'Shield', roles: ADMINS },
      { href: '/admin/departments', label: 'Department leads', icon: 'Users', roles: ADMINS },
      { href: '/integrations', label: 'Systems & access', icon: 'Link2', roles: ALL },
      { href: '/audit-logs', label: 'Audit logs', icon: 'ScrollText', roles: ADMINS },
      { href: '/profile', label: 'Profile & settings', icon: 'Settings', roles: ALL },
    ],
  },
  {
    title: 'Finance & governance',
    items: [
      { href: '/finance', label: 'Finance', icon: 'DollarSign', roles: [...ADMINS, 'finance', 'manager', 'executive'] },
      { href: '/finance-console', label: 'Finance console', icon: 'Landmark', roles: [...ADMINS, 'finance'] },
      { href: '/budget', label: 'Budgets', icon: 'Wallet', roles: [...ADMINS, 'manager', 'finance', 'executive'] },
      { href: '/legal', label: 'Legal', icon: 'Scale', roles: [...ADMINS, 'legal_counsel', 'legal'] },
      { href: '/risks', label: 'Risk register', icon: 'TriangleAlert', roles: [...ADMINS, 'manager', 'developer', 'designer', 'qa', 'legal_counsel', 'technical'] },
      { href: '/leave', label: 'Leave', icon: 'CalendarRange', roles: EMPLOYEES },
      { href: '/hr', label: 'People operations', icon: 'HeartPulse', roles: [...ADMINS, 'hr'] },
      { href: '/skills', label: 'Skills matrix', icon: 'Award', roles: [...ADMINS, 'ceo', 'hr'] },
      { href: '/shares', label: 'Shares', icon: 'PieChart', roles: [...ADMINS, 'finance', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'legal_counsel', 'marketing_manager'] },
      { href: '/vault', label: 'Credential vault', icon: 'KeyRound', roles: [...ADMINS, 'manager', 'developer', 'finance', 'hr'] },
    ],
  },
];

function isAdmin(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'director';
}

function allowedSections(profile: Pick<Profile, 'role' | 'department'> | null | undefined): NavSection[] {
  if (!profile) return [];
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (!item.roles.includes(profile.role)) return false;
      if (item.departments && !isAdmin(profile.role)) {
        return item.departments.some((department) => profile.department.toLowerCase().includes(department));
      }
      return true;
    }),
  })).filter((section) => section.items.length > 0);
}

export function navSectionsForRole(role: Role | undefined | null): NavSection[] {
  return allowedSections(role ? { role, department: '' } : null);
}

export function primaryNavSectionsForRole(role: Role | undefined | null): NavSection[] {
  return navSectionsForRole(role);
}

export function secondaryNavSectionsForRole(): NavSection[] {
  return [];
}

export function navSectionsForProfile(profile: Pick<Profile, 'role' | 'department'> | null | undefined): NavSection[] {
  return allowedSections(profile);
}

export function navItemsForRole(role: Role | undefined | null): NavItem[] {
  return navSectionsForRole(role).flatMap((section) => section.items);
}

export function canManageShares(role: Role | null | undefined): boolean {
  return role === 'admin';
}

export function canApproveLeave(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'hr', 'manager'].includes(role);
}

export function canEditWiki(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel', 'marketing', 'legal'].includes(role);
}

export function canViewAllLeave(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'hr', 'manager', 'finance'].includes(role);
}

export function canManageCredentials(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'director';
}

export function canApproveCredentialAccess(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director'].includes(role);
}

export function canViewAuditLogs(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director'].includes(role);
}
