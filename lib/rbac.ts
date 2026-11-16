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

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', roles: ALL }],
  },
  {
    title: 'Performance',
    items: [
      { href: '/analytics', label: 'KPIs & Analytics', icon: 'BarChart3', roles: ALL },
      { href: '/goals', label: 'Objectives', icon: 'Target', roles: ALL },
      { href: '/daily-progress', label: 'My KPI report', icon: 'ClipboardList', roles: EMPLOYEES },
      { href: '/daily-approvals', label: 'Report approvals', icon: 'CheckSquare', roles: ALL },
    ],
  },
  {
    title: 'Reports',
    items: [
      { href: '/reports', label: 'Performance reports', icon: 'FileText', roles: ALL },
    ],
  },
  {
    title: 'People & Organization',
    items: [
      { href: '/team', label: 'People & Departments', icon: 'Users', roles: ALL },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/kpi-admin', label: 'KPI configuration', icon: 'Target', roles: ADMINS },
      { href: '/admin', label: 'User management', icon: 'Shield', roles: ADMINS },
      { href: '/admin/departments', label: 'Departments & leads', icon: 'Building2', roles: ADMINS },
      { href: '/audit-logs', label: 'Audit logs', icon: 'ScrollText', roles: ADMINS },
      { href: '/profile', label: 'Profile & settings', icon: 'Settings', roles: ALL },
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

export function navItemsForProfile(profile: Pick<Profile, 'role' | 'department'> | null | undefined): NavItem[] {
  return navSectionsForProfile(profile).flatMap((section) => section.items);
}

export function isProfileRouteAllowed(
  profile: Pick<Profile, 'role' | 'department'> | null | undefined,
  pathname: string
): boolean {
  return navItemsForProfile(profile).some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
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
