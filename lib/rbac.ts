
import type { Profile, Role } from '@/lib/database.types';

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
  'intern',
  'partner',
  'executive',
  'marketing',
  'technical',
  'legal',
  'project',
  'product',
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

const EMPLOYEES: Role[] = ALL.filter(
  (role) => role !== 'partner'
);

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: 'LayoutDashboard',
        roles: ALL,
      },
    ],
  },

  {
    title: 'Performance',
    items: [
      {
        href: '/analytics',
        label: 'KPIs & Analytics',
        icon: 'BarChart3',
        roles: ALL,
      },
      {
        href: '/goals',
        label: 'Objectives',
        icon: 'Target',
        roles: ALL,
      },
      {
        href: '/daily-progress',
        label: 'My KPI report',
        icon: 'ClipboardList',
        roles: EMPLOYEES,
      },
      {
        href: '/daily-approvals',
        label: 'Report approvals',
        icon: 'CheckSquare',
        roles: ALL,
      },
    ],
  },

  {
    title: 'Reports',
    items: [
      {
        href: '/reports',
        label: 'Performance reports',
        icon: 'FileText',
        roles: ALL,
      },
    ],
  },

  {
    title: 'People & Organization',
    items: [
      {
        href: '/team',
        label: 'People & Departments',
        icon: 'Users',
        roles: ALL,
      },
      {
        href: '/resources',
        label: 'Company resources',
        icon: 'FolderKanban',
        roles: ALL,
      },
    ],
  },

  {
    title: 'Administration',
    items: [
      {
        href: '/kpi-admin',
        label: 'KPI configuration',
        icon: 'Target',
        roles: ADMINS,
      },
      {
        href: '/admin',
        label: 'User management',
        icon: 'Shield',
        roles: ADMINS,
      },
      {
        href: '/admin/departments',
        label: 'Departments & leads',
        icon: 'Building2',
        roles: ADMINS,
      },
      {
        href: '/audit-logs',
        label: 'Audit logs',
        icon: 'ScrollText',
        roles: ADMINS,
      },
      {
        href: '/profile',
        label: 'Profile & settings',
        icon: 'Settings',
        roles: ALL,
      },
    ],
  },
];

// --------------------------------------------------
// PROFILE AND ROLE HELPERS
// --------------------------------------------------

type RoleDepartment = Pick<
  Profile,
  'role' | 'department'
> | null | undefined;

export function isAdminProfile(
  profile: RoleDepartment
): boolean {
  if (!profile) return false;

  if (
    profile.role === 'admin' ||
    profile.role === 'director'
  ) {
    return true;
  }

  return (
    profile.role === 'executive' &&
    ['executive', 'executive department'].includes(
      String(profile.department || '')
        .trim()
        .toLowerCase()
    )
  );
}

// --------------------------------------------------
// COMPANY RESOURCES PERMISSIONS
// --------------------------------------------------

// Employees can register platforms.
// Directors and admins can manage the complete directory.

export function canAddPlatform(
  profile: RoleDepartment
): boolean {
  return !!profile && profile.role !== 'partner';
}

export function canManagePlatforms(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

// Employees can associate an existing platform
// with their own department.
// Directors and admins can assign platforms
// to multiple departments.

export function canAssignPlatformToDepartments(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

// Only directors and admins can create,
// rename or delete Drive folders and subfolders.

export function canCreateDriveFolders(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

export function canManageDriveStructure(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

// Employees can register links to shared Drive files.

export function canAddDriveFiles(
  profile: RoleDepartment
): boolean {
  return !!profile && profile.role !== 'partner';
}

// Authors and administrators can manage registered file links.

export function canManageDriveFiles(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

// --------------------------------------------------
// NAVIGATION ACCESS
// --------------------------------------------------

function allowedSections(
  profile: RoleDepartment
): NavSection[] {
  if (!profile) return [];

  return NAV_SECTIONS.map((section) => ({
    ...section,

    items: section.items.filter((item) => {
      if (
        isAdminProfile(profile) &&
        item.roles.some((role) => ADMINS.includes(role))
      ) {
        return true;
      }

      if (!item.roles.includes(profile.role)) {
        return false;
      }

      if (item.departments && !isAdminProfile(profile)) {
        return item.departments.some((department) =>
          String(profile.department || '')
            .toLowerCase()
            .includes(department)
        );
      }

      return true;
    }),
  })).filter((section) => section.items.length > 0);
}

export function navSectionsForRole(
  role: Role | undefined | null
): NavSection[] {
  return allowedSections(
    role ? { role, department: '' } : null
  );
}

export function primaryNavSectionsForRole(
  role: Role | undefined | null
): NavSection[] {
  return navSectionsForRole(role);
}

export function secondaryNavSectionsForRole(): NavSection[] {
  return [];
}

export function navSectionsForProfile(
  profile: RoleDepartment
): NavSection[] {
  return allowedSections(profile);
}

export function navItemsForProfile(
  profile: RoleDepartment
): NavItem[] {
  return navSectionsForProfile(profile).flatMap(
    (section) => section.items
  );
}

export function isProfileRouteAllowed(
  profile: RoleDepartment,
  pathname: string
): boolean {
  return navItemsForProfile(profile).some(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`)
  );
}

export function navItemsForRole(
  role: Role | undefined | null
): NavItem[] {
  return navSectionsForRole(role).flatMap(
    (section) => section.items
  );
}

// --------------------------------------------------
// EXISTING APPLICATION PERMISSIONS
// --------------------------------------------------

export function canManageShares(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

export function canApproveLeave(
  profile: RoleDepartment
): boolean {
  return (
    isAdminProfile(profile) ||
    (!!profile &&
      ['hr', 'manager'].includes(profile.role))
  );
}

export function canEditWiki(
  profile: RoleDepartment
): boolean {
  return (
    isAdminProfile(profile) ||
    (!!profile &&
      [
        'manager',
        'hr',
        'marketing_manager',
        'legal_counsel',
        'marketing',
        'legal',
      ].includes(profile.role))
  );
}

export function canViewAllLeave(
  profile: RoleDepartment
): boolean {
  return (
    isAdminProfile(profile) ||
    (!!profile &&
      ['hr', 'manager', 'finance'].includes(profile.role))
  );
}

export function canManageCredentials(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

export function canApproveCredentialAccess(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}

export function canViewAuditLogs(
  profile: RoleDepartment
): boolean {
  return isAdminProfile(profile);
}
