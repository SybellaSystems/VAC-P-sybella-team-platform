export type ProjectType =
  | 'internal'
  | 'customer'
  | 'partnership'
  | 'maintenance'
  | 'research'
  | 'software_product'
  | 'infrastructure'
  | 'marketing'
  | 'hr'
  | 'legal';

export type OwnerType = 'existing' | 'new' | 'internal';

export type BudgetSource = 'existing' | 'new' | 'skip';

export type RiskProbability = 'low' | 'medium' | 'high';
export type RiskImpact = 'low' | 'medium' | 'high';

export type MilestoneName =
  | 'Planning'
  | 'UI'
  | 'Development'
  | 'Testing'
  | 'Deployment'
  | 'Training'
  | 'Launch'
  | 'Support';

export type ProjectRole =
  | 'project_manager'
  | 'ui_designer'
  | 'frontend'
  | 'backend'
  | 'qa'
  | 'devops'
  | 'finance'
  | 'legal'
  | 'marketing'
  | 'support';

export type PermissionLevel = 'read' | 'write' | 'approve' | 'manage' | 'finance' | 'hr';

export type DependencyType =
  | 'customer'
  | 'payment'
  | 'hosting'
  | 'domain'
  | 'government'
  | 'internal'
  | 'external'
  | 'other';

export type DocumentType =
  | 'proposal'
  | 'quotation'
  | 'contract'
  | 'scope'
  | 'requirements'
  | 'design'
  | 'meeting_minutes'
  | 'invoice'
  | 'purchase_order'
  | 'research'
  | 'wireframes'
  | 'ui'
  | 'api_docs'
  | 'other';

export type MeetingFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface NewCustomer {
  name: string;
  company: string;
  industry: string;
  country: string;
  city: string;
  tin: string;
  registration_number: string;
  website: string;
  email: string;
  phone: string;
  physical_address: string;
  postal_address: string;
  contact_person_name: string;
  contact_position: string;
  contact_email: string;
  contact_phone: string;
  billing_contact: string;
  finance_contact: string;
}

export interface TeamAssignment {
  role: ProjectRole;
  member_id: string | null;
  member_name: string;
  permissions: PermissionLevel[];
  current_projects: number;
  availability: number;
}

export interface MilestoneEntry {
  name: string;
  target_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
}

export interface PhaseEntry {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  tasks: TaskEntry[];
}

export interface TaskEntry {
  title: string;
  description: string;
  estimated_hours: number;
  owner_id: string | null;
  subtasks: string[];
}

export interface RiskEntry {
  risk: string;
  probability: RiskProbability;
  impact: RiskImpact;
  owner_id: string | null;
  mitigation: string;
}

export interface DependencyEntry {
  description: string;
  dependency_type: DependencyType;
  due_date: string;
}

export interface DocumentEntry {
  name: string;
  document_type: DocumentType;
  url: string;
  description: string;
}

export interface BudgetEntry {
  budget_source: BudgetSource;
  existing_budget_id: string;
  budget_name: string;
  department: string;
  currency: string;
  estimated_cost: number;
  reserve: number;
  approval_needed: boolean;
  expense_categories: string[];
  revenue_categories: string[];
  customer_price: number;
  discount: number;
  taxes: number;
  estimated_costs: Record<string, number>;
}

export interface RequirementsEntry {
  approval_needed: boolean;
  approval_person: string;
  brand_assets: {
    logo: boolean;
    fonts: boolean;
    colors: boolean;
    photos: boolean;
    videos: boolean;
  };
  credentials_required: {
    hosting: boolean;
    domain: boolean;
    email: boolean;
    server: boolean;
    cloud: boolean;
    analytics: boolean;
    payment: boolean;
    social_media: boolean;
  };
  information_needed: string[];
}

export interface CommunicationEntry {
  channels: string[];
  meeting_frequency: MeetingFrequency;
  automatic_reminders: boolean;
  notification_recipients: string[];
  escalation_contacts: string[];
}

export interface ProjectWizardData {
  // Step 1
  project_type: ProjectType;
  // Step 2
  owner_type: OwnerType;
  existing_customer_id: string;
  new_customer: NewCustomer;
  // Step 3
  name: string;
  project_code: string;
  department: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  objectives: string[];
  deliverables: string[];
  success_criteria: string[];
  tags: string[];
  // Step 4
  budget: BudgetEntry;
  // Step 5
  documents: DocumentEntry[];
  git_repo_url: string;
  doc_links: { name: string; url: string }[];
  // Step 6
  requirements: RequirementsEntry;
  // Step 7
  team: TeamAssignment[];
  // Step 8
  start_date: string;
  end_date: string;
  warranty_end: string;
  support_end: string;
  deployment_date: string;
  maintenance_end: string;
  milestones: MilestoneEntry[];
  // Step 9
  phases: PhaseEntry[];
  // Step 10
  risks: RiskEntry[];
  dependencies: DependencyEntry[];
  // Step 11
  communication: CommunicationEntry;
}

export const DEFAULT_WIZARD_DATA: ProjectWizardData = {
  project_type: 'internal',
  owner_type: 'internal',
  existing_customer_id: '',
  new_customer: {
    name: '',
    company: '',
    industry: '',
    country: 'Rwanda',
    city: 'Kigali',
    tin: '',
    registration_number: '',
    website: '',
    email: '',
    phone: '',
    physical_address: '',
    postal_address: '',
    contact_person_name: '',
    contact_position: '',
    contact_email: '',
    contact_phone: '',
    billing_contact: '',
    finance_contact: '',
  },
  name: '',
  project_code: '',
  department: '',
  category: '',
  priority: 'medium',
  description: '',
  objectives: [],
  deliverables: [],
  success_criteria: [],
  tags: [],
  budget: {
    budget_source: 'skip',
    existing_budget_id: '',
    budget_name: '',
    department: '',
    currency: 'USD',
    estimated_cost: 0,
    reserve: 0,
    approval_needed: false,
    expense_categories: [],
    revenue_categories: [],
    customer_price: 0,
    discount: 0,
    taxes: 0,
    estimated_costs: {
      development: 0,
      design: 0,
      hosting: 0,
      licenses: 0,
      marketing: 0,
      travel: 0,
      support: 0,
      equipment: 0,
      miscellaneous: 0,
    },
  },
  documents: [],
  git_repo_url: '',
  doc_links: [],
  requirements: {
    approval_needed: false,
    approval_person: '',
    brand_assets: {
      logo: false,
      fonts: false,
      colors: false,
      photos: false,
      videos: false,
    },
    credentials_required: {
      hosting: false,
      domain: false,
      email: false,
      server: false,
      cloud: false,
      analytics: false,
      payment: false,
      social_media: false,
    },
    information_needed: [],
  },
  team: [],
  start_date: '',
  end_date: '',
  warranty_end: '',
  support_end: '',
  deployment_date: '',
  maintenance_end: '',
  milestones: [],
  phases: [],
  risks: [],
  dependencies: [],
  communication: {
    channels: ['VAC-P'],
    meeting_frequency: 'weekly',
    automatic_reminders: true,
    notification_recipients: [],
    escalation_contacts: [],
  },
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  internal: 'Internal Project',
  customer: 'Customer Project',
  partnership: 'Partnership',
  maintenance: 'Maintenance Contract',
  research: 'Research',
  software_product: 'Software Product',
  infrastructure: 'Infrastructure',
  marketing: 'Marketing Campaign',
  hr: 'HR Project',
  legal: 'Legal Project',
};

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  internal: 'Briefcase',
  customer: 'Building2',
  partnership: 'Handshake',
  maintenance: 'Wrench',
  research: 'FlaskConical',
  software_product: 'Code2',
  infrastructure: 'Server',
  marketing: 'Megaphone',
  hr: 'Users',
  legal: 'Scale',
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  project_manager: 'Project Manager',
  ui_designer: 'UI Designer',
  frontend: 'Frontend Developer',
  backend: 'Backend Developer',
  qa: 'QA Engineer',
  devops: 'DevOps',
  finance: 'Finance',
  legal: 'Legal',
  marketing: 'Marketing',
  support: 'Support',
};

export const DEFAULT_MILESTONES: MilestoneEntry[] = [
  { name: 'Planning', target_date: '', status: 'planned' },
  { name: 'UI', target_date: '', status: 'planned' },
  { name: 'Development', target_date: '', status: 'planned' },
  { name: 'Testing', target_date: '', status: 'planned' },
  { name: 'Deployment', target_date: '', status: 'planned' },
  { name: 'Training', target_date: '', status: 'planned' },
  { name: 'Launch', target_date: '', status: 'planned' },
  { name: 'Support', target_date: '', status: 'planned' },
];

export const DEFAULT_PHASES: PhaseEntry[] = [
  {
    name: 'Planning',
    description: 'Requirements gathering, scope definition, and project setup',
    start_date: '',
    end_date: '',
    tasks: [],
  },
  {
    name: 'Design',
    description: 'UI/UX design, wireframes, and design system',
    start_date: '',
    end_date: '',
    tasks: [],
  },
  {
    name: 'Development',
    description: 'Implementation of features and functionality',
    start_date: '',
    end_date: '',
    tasks: [],
  },
  {
    name: 'Testing',
    description: 'QA, bug fixing, and validation',
    start_date: '',
    end_date: '',
    tasks: [],
  },
  {
    name: 'Deployment',
    description: 'Release to production and go-live',
    start_date: '',
    end_date: '',
    tasks: [],
  },
];

export const DEFAULT_INFORMATION_CHECKLIST = [
  'Logo',
  'Hosting',
  'Domain',
  'Content',
  'Images',
  'Videos',
  'Pricing',
  'Menu',
  'Contacts',
  'Legal Docs',
];

export const WIZARD_STEPS = [
  { id: 1, name: 'Project Type', icon: 'Briefcase' },
  { id: 2, name: 'Owner', icon: 'Building2' },
  { id: 3, name: 'Information', icon: 'FileText' },
  { id: 4, name: 'Financial', icon: 'DollarSign' },
  { id: 5, name: 'Documentation', icon: 'FolderOpen' },
  { id: 6, name: 'Requirements', icon: 'ClipboardCheck' },
  { id: 7, name: 'Team', icon: 'Users' },
  { id: 8, name: 'Timeline', icon: 'Calendar' },
  { id: 9, name: 'Work Breakdown', icon: 'ListTree' },
  { id: 10, name: 'Risks', icon: 'TriangleAlert' },
  { id: 11, name: 'Communication', icon: 'MessageSquare' },
  { id: 12, name: 'Review', icon: 'CircleCheck' },
] as const;

export function generateProjectCode(prefix: string = 'PRJ'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

export function calculateReadinessScore(data: ProjectWizardData): number {
  let score = 0;
  let total = 0;

  const checks: [boolean, number][] = [
    [!!data.name, 10],
    [!!data.description, 5],
    [data.objectives.length > 0, 5],
    [data.deliverables.length > 0, 5],
    [data.success_criteria.length > 0, 5],
    [!!data.start_date, 5],
    [!!data.end_date, 5],
    [data.team.length > 0, 10],
    [data.team.some((t) => t.role === 'project_manager' && t.member_id), 10],
    [data.milestones.length > 0, 5],
    [data.phases.length > 0, 5],
    [data.phases.some((p) => p.tasks.length > 0), 5],
    [data.budget.budget_source !== 'skip' || data.budget.customer_price > 0, 5],
    [data.documents.length > 0, 5],
    [data.risks.length > 0 || data.project_type === 'internal', 5],
    [data.communication.channels.length > 0, 5],
    [
      data.project_type === 'internal' ||
        data.owner_type === 'internal' ||
        (data.owner_type === 'existing' && !!data.existing_customer_id) ||
        (data.owner_type === 'new' && !!data.new_customer.name),
      10,
    ],
  ];

  checks.forEach(([passed, weight]) => {
    total += weight;
    if (passed) score += weight;
  });

  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export function calculateFinancials(data: ProjectWizardData) {
  const totalCost =
    Object.values(data.budget.estimated_costs).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    ) + (data.budget.estimated_cost || 0);

  const netPrice =
    data.budget.customer_price - data.budget.discount + data.budget.taxes;
  const revenue = netPrice || data.budget.estimated_cost || 0;
  const grossProfit = revenue - totalCost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    totalCost,
    revenue,
    grossProfit,
    margin: Math.round(margin * 100) / 100,
  };
}
