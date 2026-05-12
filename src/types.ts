export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  EXECUTIVE = 'EXECUTIVE',
  CEO_FOUNDER = 'CEO_FOUNDER',
  OPERATIONS_MANAGER = 'OPERATIONS_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  PRODUCT_MANAGER = 'PRODUCT_MANAGER',
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER',
  QA_TESTER = 'QA_TESTER',
  HR = 'HR',
  FINANCE = 'FINANCE',
  SALES_MARKETING = 'SALES_MARKETING',
  SUPPORT = 'SUPPORT',
  ANALYST = 'ANALYST',
  INTERN = 'INTERN',
  VIEWER = 'VIEWER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface WorkspaceModule {
  key: string;
  name: string;
  description: string;
  isActive: boolean;
  requiredRoles: UserRole[];
}

export interface WorkspaceRecord {
  id: string;
  featureKey: string;
  userId: string;
  action: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  eventType: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SYSTEM_CHANGE';
  details: string;
  timestamp: string;
}
