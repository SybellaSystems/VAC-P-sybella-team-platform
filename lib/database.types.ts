export type Role =
  | 'admin'
  | 'director'
  | 'manager'
  | 'developer'
  | 'designer'
  | 'qa'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'legal_counsel'
  | 'marketing_manager'
  | 'customer_support'
  | 'operations'
  | 'ceo'
  | string;

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  avatar_url: string;
  department: string;
  phone: string;
  location: string;
  bio: string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  notification_preferences?: {
    browser?: boolean;
    email?: boolean;
    dnd?: boolean;
  };
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  status: 'active' | 'inactive' | 'prospect' | 'churned';
  total_contract_value: number;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  customer_id: string | null;
  budget: number;
  spent: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: 'todo' | 'started' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskSubtask = {
  id: string;
  task_id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' | 'cancelled';
  sort_order: number;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectFeatureLinkType =
  | 'customer'
  | 'financial_record'
  | 'budget_proposal'
  | 'wiki_page'
  | 'repo_link';

export type ProjectFeatureLink = {
  id: string;
  project_id: string;
  feature_type: ProjectFeatureLinkType;
  feature_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type ShareAllocation = {
  id: string;
  share_id: string;
  allocation_type: 'internal' | 'external';
  profile_id: string | null;
  external_party_name: string | null;
  external_party_email: string | null;
  units: number;
  share_value: number | null;
  notes: string;
  allocated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HrCandidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role_applied: string;
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  notes: string;
  assigned_hr: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HrPerformanceReview = {
  id: string;
  member_id: string;
  reviewer_id: string | null;
  period_label: string;
  summary: string;
  goals: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  created_at: string;
  updated_at: string;
};

export type HrOnboardingTask = {
  id: string;
  member_id: string;
  title: string;
  description: string;
  is_done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectBudgetLink = {
  id: string;
  project_id: string;
  budget_proposal_id: string;
  link_role: string;
  created_by: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'direct';
  created_by: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'report' | 'escalation';
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  sender?: Profile;
};

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'sprint' | 'milestone' | 'escalation';
export type ReportStatus = 'draft' | 'submitted' | 'pending_approval' | 'reviewed' | 'approved' | 'flagged';
export type ReportRiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';

export type AccountabilityReport = {
  id: string;
  member_id: string;
  report_date: string;
  report_type: ReportType;
  report_role: Role;
  department: string;
  template: 'structured' | 'legacy';
  completed_tasks: string;
  planned_tasks: string;
  blockers: string;
  notes: string;
  summary: string | null;
  report_data: Record<string, any> | null;
  kpi_snapshot: Record<string, number> | null;
  related_project_ids: string[] | null;
  related_task_ids: string[] | null;
  operational_health: number | null;
  confidence_score: number | null;
  risk_level: ReportRiskLevel;
  review_notes: string;
  approval_workflow_id: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialRecord = {
  id: string;
  title: string;
  type: 'income' | 'expense' | 'budget' | 'invoice';
  amount: number;
  currency: string;
  category: string;
  project_id: string | null;
  description: string;
  date: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'task' | 'message';
  is_read: boolean;
  link: string;
  created_at: string;
};

export type WikiPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  summary: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by_user_id: string | null;
  created_by_auth_user_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: {
    template?: 'Policy' | 'Playbook' | 'Release note' | 'How-to' | 'FAQ' | 'Executive summary';
    category?: string;
    tags?: string[];
    featured?: boolean;
    cover_image?: string;
  };
};

export type ProjectAssignment = {
  id: string;
  project_id: string;
  member_id: string;
  role_in_project: string;
  assigned_at: string;
};

// Supabase Database type - uses any for simplicity with the supabase-js client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
