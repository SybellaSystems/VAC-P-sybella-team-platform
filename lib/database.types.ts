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
  industry?: string;
  city?: string;
  tin?: string;
  registration_number?: string;
  website?: string;
  postal_address?: string;
  physical_address?: string;
  contact_person_name?: string;
  contact_position?: string;
  contact_email?: string;
  contact_phone?: string;
  billing_contact?: string;
  finance_contact?: string;
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
  // Wizard fields
  project_code?: string;
  project_type?: string;
  department?: string;
  category?: string;
  objectives?: string[];
  deliverables?: string[];
  success_criteria?: string[];
  tags?: string[];
  customer_price?: number;
  discount?: number;
  taxes?: number;
  expected_revenue?: number;
  estimated_costs?: Record<string, number>;
  warranty_end?: string | null;
  support_end?: string | null;
  deployment_date?: string | null;
  maintenance_end?: string | null;
  health_score?: number;
  readiness_score?: number;
  communication_channels?: string[];
  meeting_frequency?: string;
  escalation_contacts?: string[];
  notification_recipients?: string[];
  approval_needed?: boolean;
  approval_person?: string;
  brand_assets?: Record<string, boolean>;
  credentials_required?: Record<string, boolean>;
  git_repo_url?: string;
  doc_links?: { name: string; url: string }[];
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

export type ProjectIntegrationAuthType = 'none' | 'apikey' | 'basic' | 'bearer' | 'oauth';

export type ProjectIntegrationCredentials = {
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type ProjectIntegration = {
  id: string;
  project_id: string;
  platform: string;
  endpoint: string;
  auth_type: ProjectIntegrationAuthType;
  credentials: ProjectIntegrationCredentials | null;
  metadata: Record<string, unknown>;
  last_synced_at: string | null;
  last_pushed_payload?: unknown;
  last_pushed_at?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  project_id?: string | null;
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
  report_data: Record<string, unknown> | null;
  kpi_snapshot: Record<string, unknown> | null;
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

export type RepoLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  link_type: 'document' | 'repo' | 'drive' | 'external' | 'spreadsheet';
  category: string;
  access_level: 'public' | 'internal' | 'restricted';
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaveRequest = {
  id: string;
  member_id: string;
  leave_type: 'vacation' | 'sick' | 'personal' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetProposal = {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  project_id: string | null;
  proposed_by: string | null;
  current_step: number;
  total_steps: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  impact_analysis: string;
  created_at: string;
  updated_at: string;
};

export type ApprovalWorkflow = {
  id: string;
  entity_type: 'budget' | 'leave' | 'credential_access' | 'report' | 'other';
  entity_id: string;
  current_step: number;
  total_steps: number;
  workflow_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type ApprovalStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  approver_role: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  notes: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  notes: string;
  ip_address: string;
  created_at: string;
};

export type CredentialCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
};

export type CredentialVault = {
  id: string;
  name: string;
  category_id: string;
  description: string;
  platform_name: string;
  username: string;
  password_encrypted: string;
  access_level: 'public' | 'restricted' | 'admin_only';
  required_role: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_by: string | null;
  last_accessed_at: string | null;
};

export type CredentialAccessRequest = {
  id: string;
  credential_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  reason: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAssignment = {
  id: string;
  project_id: string;
  member_id: string;
  role_in_project: 'viewer' | 'editor' | 'admin';
  assigned_at: string;
  can_edit_tasks?: boolean;
  can_edit_project?: boolean;
  can_manage_members?: boolean;
  can_view_analytics?: boolean;
  can_import_export?: boolean;
};

export type ProjectCustomField = {
  id: string;
  project_id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'currency';
  field_label: string;
  is_visible: boolean;
  sort_order: number;
  options?: unknown[];
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
  id: string;
  project_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type TaskMessage = {
  id: string;
  task_id: string;
  channel_id?: string;
  message_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProjectAnalytic = {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  metric_date: string;
  dimension_1?: string;
  dimension_2?: string;
  created_at: string;
};

export type ImportJob = {
  id: string;
  project_id: string;
  file_name: string;
  file_type: 'csv' | 'xlsx';
  total_rows?: number;
  imported_rows: number;
  failed_rows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_by: string;
  created_at: string;
  completed_at?: string;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description?: string;
  category?: 'marketing' | 'development' | 'sales' | 'operations' | 'hr' | 'finance' | 'general';
  structure: Record<string, unknown>;
  custom_fields?: ProjectCustomField[];
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ExtendedProject = Project & {
  import_source?: 'manual' | 'csv' | 'excel' | 'api' | null;
  source_file_name?: string;
  raw_import_data?: Record<string, unknown>;
  column_mapping?: Record<string, unknown>;
  is_template?: boolean;
  template_name?: string;
  category?: 'marketing' | 'development' | 'sales' | 'operations' | 'hr' | 'finance' | 'general';
};

export type ExtendedTask = Task & {
  message_context?: string;
  parent_task_id?: string;
  estimated_hours?: number;
  actual_hours?: number;
  visible_in_chat?: boolean;
};

// Supabase Database type - uses any for simplicity with the supabase-js client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
