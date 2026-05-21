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
  'customer_support',
  'operations',
  'ceo',
];

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const DASHBOARD: NavItem = {
  href: '/dashboard',
  label: 'Dashboard',
  icon: 'LayoutDashboard',
  roles: ALL_ROLES,
};

const WORKSPACE: NavSection = {
  title: 'Workspace',
  items: [
    DASHBOARD,
    { href: '/accountability', label: 'Accountability', icon: 'ClipboardList', roles: ALL_ROLES },
    { href: '/approvals', label: 'Approvals', icon: 'CheckSquare', roles: ['admin', 'director', 'hr', 'manager', 'finance'] },
    { href: '/messages', label: 'Messages', icon: 'MessageSquare', roles: ALL_ROLES },
    { href: '/notifications', label: 'Notifications', icon: 'Bell', roles: ALL_ROLES },
  ],
};

const OPERATIONS: NavSection = {
  title: 'Operations',
  items: [
    { href: '/projects', label: 'Projects', icon: 'FolderKanban', roles: ['admin', 'director', 'manager', 'developer', 'designer', 'qa', 'marketing_manager'] },
    { href: '/project-office', label: 'Project office', icon: 'LayoutGrid', roles: ['manager'] },
    { href: '/my-work', label: 'My work', icon: 'Briefcase', roles: ['developer', 'designer', 'qa'] },
    { href: '/customers', label: 'Customers', icon: 'Building2', roles: ['admin', 'director', 'manager', 'sales', 'marketing_manager'] },
    { href: '/sales-pipeline', label: 'Sales pipeline', icon: 'TrendingUp', roles: ['sales', 'admin', 'director', 'marketing_manager'] },
  ],
};

const FINANCE_AND_GOVERNANCE: NavSection = {
  title: 'Finance & Governance',
  items: [
    { href: '/finance', label: 'Finance', icon: 'DollarSign', roles: ['admin', 'director', 'finance', 'manager'] },
    { href: '/finance-console', label: 'Finance console', icon: 'Landmark', roles: ['finance', 'admin', 'director'] },
    { href: '/billing', label: 'Billing', icon: 'Wallet', roles: ['admin', 'director', 'manager', 'finance'] },
    { href: '/budget', label: 'Budgets', icon: 'Wallet', roles: ['admin', 'director', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'finance'] },
    { href: '/audit-logs', label: 'Audit logs', icon: 'ScrollText', roles: ['admin', 'director'] },
    { href: '/legal', label: 'Legal', icon: 'Scale', roles: ['legal_counsel', 'admin', 'director'] },
    { href: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['admin', 'director', 'manager', 'finance', 'marketing_manager'] },
  ],
};

const PEOPLE: NavSection = {
  title: 'People & HR',
  items: [
    { href: '/team', label: 'Team', icon: 'Users', roles: ['admin', 'director', 'manager', 'hr'] },
    { href: '/hr', label: 'HR hub', icon: 'HeartPulse', roles: ['hr', 'admin', 'director'] },
    { href: '/leave', label: 'Leave', icon: 'CalendarRange', roles: ALL_ROLES },
    { href: '/shares', label: 'Shares', icon: 'PieChart', roles: ['admin', 'director', 'finance', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'legal_counsel', 'marketing_manager'] },
  ],
};

const KNOWLEDGE: NavSection = {
  title: 'Knowledge & Reference',
  items: [
    { href: '/wiki', label: 'Wiki', icon: 'BookOpen', roles: ALL_ROLES },
    { href: '/repo-links', label: 'Repo links', icon: 'Link2', roles: ALL_ROLES },
  ],
};

const NAV_SECTIONS: NavSection[] = [WORKSPACE, OPERATIONS, FINANCE_AND_GOVERNANCE, PEOPLE, KNOWLEDGE];

export function navSectionsForRole(role: Role | undefined | null): NavSection[] {
  if (!role) return [];
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
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
  return !!role && ['admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel'].includes(role);
}

export function canViewAllLeave(role: Role | null | undefined): boolean {
  return !!role && ['admin', 'director', 'hr', 'manager', 'finance'].includes(role);
}
