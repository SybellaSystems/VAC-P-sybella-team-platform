import { UserRole } from './types';
import { 
  Shield, 
  BarChart3, 
  Crown, 
  Settings, 
  Trello, 
  Layers, 
  Code2, 
  Palette, 
  CheckCircle2, 
  Users2, 
  Wallet, 
  Megaphone, 
  Headset, 
  LineChart, 
  GraduationCap, 
  Eye 
} from 'lucide-react';

export const ROLE_CONFIG: Record<UserRole, { 
  label: string, 
  description: string, 
  color: string, 
  icon: any 
}> = {
  [UserRole.SUPERADMIN]: {
    label: 'Superadmin',
    description: 'Full system control and technical authority.',
    color: 'bg-red-500',
    icon: Shield
  },
  [UserRole.EXECUTIVE]: {
    label: 'Executive',
    description: 'Strategic decision maker and analytics oversight.',
    color: 'bg-purple-600',
    icon: BarChart3
  },
  [UserRole.CEO_FOUNDER]: {
    label: 'CEO / Founder',
    description: 'Top-level business vision and oversight.',
    color: 'bg-blue-600',
    icon: Crown
  },
  [UserRole.OPERATIONS_MANAGER]: {
    label: 'Operations Manager',
    description: 'Workflow management and operational integrity.',
    color: 'bg-orange-500',
    icon: Settings
  },
  [UserRole.PROJECT_MANAGER]: {
    label: 'Project Manager',
    description: 'Execution lifecycle and task coordination.',
    color: 'bg-yellow-500',
    icon: Trello
  },
  [UserRole.PRODUCT_MANAGER]: {
    label: 'Product Manager',
    description: 'Feature development and module prioritization.',
    color: 'bg-green-600',
    icon: Layers
  },
  [UserRole.DEVELOPER]: {
    label: 'Developer',
    description: 'Internal tool building and implementation.',
    color: 'bg-blue-500',
    icon: Code2
  },
  [UserRole.DESIGNER]: {
    label: 'Designer',
    description: 'UI/UX systems and asset creation.',
    color: 'bg-purple-500',
    icon: Palette
  },
  [UserRole.QA_TESTER]: {
    label: 'QA Tester',
    description: 'Quality assurance and bug validation.',
    color: 'bg-brown-600',
    icon: CheckCircle2
  },
  [UserRole.HR]: {
    label: 'HR',
    description: 'People operations and team structure.',
    color: 'bg-orange-600',
    icon: Users2
  },
  [UserRole.FINANCE]: {
    label: 'Finance',
    description: 'Budget tracking and financial reporting.',
    color: 'bg-yellow-600',
    icon: Wallet
  },
  [UserRole.SALES_MARKETING]: {
    label: 'Sales & Marketing',
    description: 'Outreach, growth, and campaign logs.',
    color: 'bg-green-500',
    icon: Megaphone
  },
  [UserRole.SUPPORT]: {
    label: 'Support',
    description: 'User assistance and ticket resolution.',
    color: 'bg-blue-400',
    icon: Headset
  },
  [UserRole.ANALYST]: {
    label: 'Analyst',
    description: 'Data insights and performance trends.',
    color: 'bg-purple-400',
    icon: LineChart
  },
  [UserRole.INTERN]: {
    label: 'Intern',
    description: 'Entry-level contribution with limited access.',
    color: 'bg-gray-500',
    icon: GraduationCap
  },
  [UserRole.VIEWER]: {
    label: 'Viewer',
    description: 'Read-only access to dashboards.',
    color: 'bg-gray-300',
    icon: Eye
  }
};
