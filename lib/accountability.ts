'use client';

import type { Profile, Project, Task, Role } from '@/lib/database.types';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'sprint' | 'milestone' | 'escalation';
export type ReportStatus = 'draft' | 'submitted' | 'pending_approval' | 'reviewed' | 'approved' | 'flagged';
export type ReportRiskLevel = 'normal' | 'low' | 'medium' | 'high' | 'critical';

export type ReportFieldType = 'number' | 'text' | 'textarea' | 'select' | 'slider' | 'toggle';

export type ReportMetricMap = Record<string, number>;

export type RoleReportField = {
  id: string;
  label: string;
  type: ReportFieldType;
  hint?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  visibleWhen?: (formValues: Record<string, any>) => boolean;
};

export type RoleReportTemplate = {
  role: Role | 'custom';
  title: string;
  subtitle: string;
  description: string;
  fields: RoleReportField[];
};

const baseTemplates: Record<string, RoleReportTemplate> = {
  ceo: {
    role: 'ceo',
    title: 'Executive Operational Update',
    subtitle: 'High-level company health, decisions, and strategic risk.',
    description: 'Submit a structured leadership report that drives executive intelligence and exposes organizational signals.',
    fields: [
      { id: 'operational_health_score', label: 'Company Health Score', type: 'slider', hint: 'How healthy is the organization operationally?', min: 0, max: 100, required: true },
      { id: 'strategic_discussions', label: 'Strategic Discussions', type: 'number', hint: 'Count of leadership reviews, board conversations and major decisions.', min: 0 },
      { id: 'department_reviews', label: 'Department Reviews Completed', type: 'number', min: 0 },
      { id: 'budget_approvals_reviewed', label: 'Budget Approvals Reviewed', type: 'number', min: 0 },
      { id: 'active_blockers_escalated', label: 'Active Blockers Escalated', type: 'number', min: 0 },
      { id: 'revenue_opportunities', label: 'Revenue Opportunities Identified', type: 'number', min: 0 },
      { id: 'weekly_goals_progress', label: 'Weekly Goals Progress', type: 'slider', hint: 'Overall progress against weekly strategic goals.', min: 0, max: 100 },
      { id: 'organizational_risks', label: 'Organizational Risks Identified', type: 'number', min: 0 },
      { id: 'notes', label: 'Escalations / Notes', type: 'textarea', hint: 'Briefly capture any incidents, escalations or executive decisions.' },
    ],
  },
  manager: {
    role: 'manager',
    title: 'Project Manager Report',
    subtitle: 'Structured sprint and project progress with blockers, coordination and confidence.',
    description: 'Share progress in a way that translates directly into delivery analytics and risk forecasting.',
    fields: [
      { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', hint: 'Number of completed tasks since last update.', min: 0, required: true },
      { id: 'tasks_delayed', label: 'Tasks Delayed', type: 'number', hint: 'Number of tasks that slipped or are late.', min: 0 },
      { id: 'new_blockers', label: 'New Blockers', type: 'number', hint: 'New blockers raised during this period.', min: 0 },
      { id: 'resolved_blockers', label: 'Resolved Blockers', type: 'number', hint: 'Blockers you helped close.', min: 0 },
      { id: 'team_responsiveness', label: 'Team Responsiveness', type: 'select', options: ['Excellent', 'Good', 'Moderate', 'Slow', 'Blocked'], hint: 'How responsive was the team this cycle?' },
      { id: 'sprint_progress', label: 'Sprint Progress', type: 'slider', min: 0, max: 100, hint: 'Overall sprint completion percent.' },
      { id: 'milestone_progress', label: 'Milestone Progress', type: 'slider', min: 0, max: 100, hint: 'Key milestone delivery progress.' },
      { id: 'cross_team_coordination', label: 'Cross-Team Coordination Count', type: 'number', hint: 'Times you coordinated across teams.', min: 0 },
      { id: 'operational_risk', label: 'Operational Risk Level', type: 'select', options: ['normal', 'low', 'medium', 'high', 'critical'], hint: 'Risk level for delivery and team health.' },
      { id: 'delivery_confidence', label: 'Delivery Confidence', type: 'slider', min: 0, max: 100, hint: 'How confident are you in delivery outcomes?' },
      { id: 'notes', label: 'Blockers / Escalations', type: 'textarea', hint: 'Add only the crucial context that requires action or escalation.' },
    ],
  },
  developer: {
    role: 'developer',
    title: 'Developer Progress Update',
    subtitle: 'Structured engineering reporting with tasks, PRs, deployments and blockers.',
    description: 'Capture measurable development output and risks without lengthy status writing.',
    fields: [
      { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', hint: 'Tracked tasks finished.', min: 0, required: true },
      { id: 'bugs_fixed', label: 'Bugs Fixed', type: 'number', hint: 'Number of bugs or customer issues resolved.', min: 0 },
      { id: 'features_shipped', label: 'Features Shipped', type: 'number', hint: 'Feature or scope delivered.', min: 0 },
      { id: 'prs_merged', label: 'Pull Requests Merged', type: 'number', hint: 'Merged PRs associated with your work.', min: 0 },
      { id: 'code_reviews', label: 'Code Reviews Completed', type: 'number', hint: 'Reviews completed for teammates.', min: 0 },
      { id: 'deployment_status', label: 'Deployment Status', type: 'select', options: ['stable', 'in_progress', 'blocked', 'not_applicable'], hint: 'Current deployment state.' },
      { id: 'test_coverage_changes', label: 'Test Coverage Impact', type: 'select', options: ['improved', 'unchanged', 'reduced', 'not_applicable'], hint: 'How did test coverage move?' },
      { id: 'technical_debt_addressed', label: 'Technical Debt Addressed', type: 'number', hint: 'Refactors or maintenance work completed.', min: 0 },
      { id: 'blockers_encountered', label: 'Blockers Encountered', type: 'number', hint: 'New blockers or dependencies blocking progress.', min: 0 },
      { id: 'documentation_updates', label: 'Documentation Updated', type: 'toggle', hint: 'Did you update docs or handover notes?' },
      { id: 'operational_risk', label: 'Operational Risk Level', type: 'select', options: ['normal', 'low', 'medium', 'high', 'critical'], hint: 'Assess risk exposure for your engineering work.' },
      { id: 'delivery_confidence', label: 'Delivery Confidence', type: 'slider', min: 0, max: 100, hint: 'How confident are you in your progress?' },
      { id: 'notes', label: 'Blockers / Escalations', type: 'textarea', hint: 'Capture only the key issue or escalation context.' },
    ],
  },
  marketing_manager: {
    role: 'marketing_manager',
    title: 'Marketing Momentum Report',
    subtitle: 'Campaign, lead and engagement metrics wrapped in structured operational insight.',
    description: 'Update with measurable marketing activity and progress without long-form narrative.',
    fields: [
      { id: 'students_contacted', label: 'Students Contacted', type: 'number', min: 0 },
      { id: 'employers_contacted', label: 'Employers Contacted', type: 'number', min: 0 },
      { id: 'campaigns_launched', label: 'Campaigns Launched', type: 'number', min: 0, required: true },
      { id: 'leads_generated', label: 'Leads Generated', type: 'number', min: 0 },
      { id: 'social_posts', label: 'Social Posts Published', type: 'number', min: 0 },
      { id: 'community_interactions', label: 'Community Interactions', type: 'number', min: 0 },
      { id: 'conversion_estimate', label: 'Conversion Estimate (%)', type: 'slider', min: 0, max: 100 },
      { id: 'engagement_growth', label: 'Engagement Growth (%)', type: 'slider', min: 0, max: 100 },
      { id: 'partnerships_initiated', label: 'Partnerships Initiated', type: 'number', min: 0 },
      { id: 'testimonials_collected', label: 'Testimonials Collected', type: 'number', min: 0 },
      { id: 'referral_activity', label: 'Referral Activity', type: 'number', min: 0 },
      { id: 'notes', label: 'Notes & Insights', type: 'textarea', hint: 'Trends, surprises, or campaign risks.' },
    ],
  },
  hr: {
    role: 'hr',
    title: 'HR Operational Report',
    subtitle: 'People, hiring and morale metrics structured for team health visibility.',
    description: 'Capture the most important people metrics and risk signals with minimal typing.',
    fields: [
      { id: 'candidates_reviewed', label: 'Candidates Reviewed', type: 'number', min: 0 },
      { id: 'interviews_scheduled', label: 'Interviews Scheduled', type: 'number', min: 0 },
      { id: 'onboarding_progress', label: 'Onboarding Progress (%)', type: 'slider', min: 0, max: 100 },
      { id: 'conflicts_identified', label: 'Internal Conflicts Identified', type: 'number', min: 0 },
      { id: 'leave_requests_processed', label: 'Leave Requests Processed', type: 'number', min: 0 },
      { id: 'attendance_consistency', label: 'Attendance Consistency', type: 'select', options: ['Excellent', 'Good', 'Moderate', 'Poor'], hint: 'How stable is attendance this cycle?' },
      { id: 'team_morale', label: 'Team Morale', type: 'select', options: ['High', 'Stable', 'Low', 'Critical'], hint: 'How would you describe team morale?' },
      { id: 'notes', label: 'People Risks / Notes', type: 'textarea', hint: 'Include any behaviour, conflict, or leave risk.' },
    ],
  },
  legal_counsel: {
    role: 'legal_counsel',
    title: 'Legal Counsel Update',
    subtitle: 'Compliance, agreements and governance metrics in a structured format.',
    description: 'Capture legal review activity and risk without operational noise.',
    fields: [
      { id: 'contracts_reviewed', label: 'Contracts Reviewed', type: 'number', min: 0 },
      { id: 'policies_updated', label: 'Policies Updated', type: 'number', min: 0 },
      { id: 'compliance_checks', label: 'Compliance Checks Completed', type: 'number', min: 0 },
      { id: 'risks_identified', label: 'Risks Identified', type: 'number', min: 0 },
      { id: 'ip_verification', label: 'IP Verification Status', type: 'toggle', hint: 'Has IP ownership been verified for active items?' },
      { id: 'governance_reviews', label: 'Governance Reviews', type: 'number', min: 0 },
      { id: 'agreements_validated', label: 'Agreement Validations', type: 'number', min: 0 },
      { id: 'legal_escalations', label: 'Legal Escalations', type: 'number', min: 0 },
      { id: 'documentation_alerts', label: 'Missing Docs Alerts', type: 'number', min: 0 },
      { id: 'notes', label: 'Legal Notes / Risks', type: 'textarea', hint: 'Summarize any compliance or legal risk context.' },
    ],
  },
  finance: {
    role: 'finance',
    title: 'Finance Operational Report',
    subtitle: 'Cashflow, approvals and financial risk metrics, structured for operational visibility.',
    description: 'Turn your finance activity into measurable operational intelligence.',
    fields: [
      { id: 'expenses_reviewed', label: 'Expenses Reviewed', type: 'number', min: 0 },
      { id: 'budget_proposals_approved', label: 'Budget Proposals Approved', type: 'number', min: 0 },
      { id: 'revenue_updates', label: 'Revenue Updates', type: 'number', min: 0 },
      { id: 'cashflow_observations', label: 'Cash Flow Observations', type: 'number', min: 0 },
      { id: 'financial_risks', label: 'Financial Risks Identified', type: 'number', min: 0 },
      { id: 'cost_savings', label: 'Cost Saving Opportunities', type: 'number', min: 0 },
      { id: 'project_spending_links', label: 'Linked Project Spending Items', type: 'number', min: 0 },
      { id: 'outstanding_approvals', label: 'Outstanding Approvals', type: 'number', min: 0 },
      { id: 'notes', label: 'Financial Notes', type: 'textarea', hint: 'Flag cashflow, risk or budget concerns.' },
    ],
  },
  sales: {
    role: 'sales',
    title: 'Sales Activity Report',
    subtitle: 'Prospects, pipeline movement and revenue signals captured in a structured update.',
    description: 'Capture sales momentum in measurable fields and keep the pipeline visible.',
    fields: [
      { id: 'prospects_contacted', label: 'Prospects Contacted', type: 'number', min: 0 },
      { id: 'meetings_scheduled', label: 'Meetings Scheduled', type: 'number', min: 0 },
      { id: 'deals_progressed', label: 'Deals Progressed', type: 'number', min: 0 },
      { id: 'pipeline_movement', label: 'Pipeline Movement', type: 'number', min: 0 },
      { id: 'conversion_estimate', label: 'Conversion Estimate (%)', type: 'slider', min: 0, max: 100 },
      { id: 'follow_ups_completed', label: 'Follow-ups Completed', type: 'number', min: 0 },
      { id: 'notes', label: 'Sales Notes', type: 'textarea', hint: 'Flag deal risk, customer feedback or escalation needs.' },
    ],
  },
  customer_support: {
    role: 'customer_support',
    title: 'Customer Support Report',
    subtitle: 'Ticket resolution, satisfaction and escalation metrics in a compact form.',
    description: 'Feed customer experience data directly into the operational engine.',
    fields: [
      { id: 'tickets_resolved', label: 'Tickets Resolved', type: 'number', min: 0 },
      { id: 'complaints_received', label: 'Customer Complaints', type: 'number', min: 0 },
      { id: 'resolution_speed', label: 'Resolution Speed (hrs)', type: 'number', min: 0 },
      { id: 'escalated_issues', label: 'Escalated Issues', type: 'number', min: 0 },
      { id: 'satisfaction_score', label: 'Satisfaction Indicator (%)', type: 'slider', min: 0, max: 100 },
      { id: 'recurring_problems', label: 'Recurring Problems Identified', type: 'number', min: 0 },
      { id: 'notes', label: 'Support Notes', type: 'textarea', hint: 'Summarize customer trends and escalation context.' },
    ],
  },
  operations: {
    role: 'operations',
    title: 'Operations Intelligence Report',
    subtitle: 'Bottlenecks, process improvements, and operational risk captured structurally.',
    description: 'Report operations activity in a way that updates dashboard KPIs automatically.',
    fields: [
      { id: 'process_improvements', label: 'Process Improvements', type: 'number', min: 0 },
      { id: 'bottlenecks_identified', label: 'Bottlenecks Identified', type: 'number', min: 0 },
      { id: 'issues_resolved', label: 'Operational Issues Resolved', type: 'number', min: 0 },
      { id: 'capacity_change', label: 'Capacity Change (%)', type: 'slider', min: -100, max: 100, hint: 'Positive values mean more available capacity.' },
      { id: 'control_checks', label: 'Risk Controls Checked', type: 'number', min: 0 },
      { id: 'operational_risk', label: 'Operational Risk Level', type: 'select', options: ['normal', 'low', 'medium', 'high', 'critical'], hint: 'Risk level for operational continuity.' },
      { id: 'notes', label: 'Operations Notes', type: 'textarea', hint: 'Document the key operational risks or system constraints.' },
    ],
  },
  admin: {
    role: 'admin',
    title: 'Administrative Operational Report',
    subtitle: 'Cross-platform activity, approvals and dependencies surfaced in a structured report.',
    description: 'Create a compact operational update that supports governance, approvals, and team visibility.',
    fields: [
      { id: 'department_reviews', label: 'Department Reviews Completed', type: 'number', min: 0 },
      { id: 'approvals_reviewed', label: 'Approvals Reviewed', type: 'number', min: 0 },
      { id: 'escalations_initiated', label: 'Escalations Initiated', type: 'number', min: 0 },
      { id: 'linked_references', label: 'Linked Operational References', type: 'number', min: 0, hint: 'Pages, tickets, approvals, or workflows referenced.' },
      { id: 'operational_health_score', label: 'Operational Health Score', type: 'slider', min: 0, max: 100 },
      { id: 'notes', label: 'Notes & Special Context', type: 'textarea', hint: 'Important dependencies, approvals, or risks.' },
    ],
  },
  default: {
    role: 'custom',
    title: 'Operational Report',
    subtitle: 'Structured update with measurable progress, blockers and notes.',
    description: 'Submit a report that reflects work, risks, and progress without long text.',
    fields: [
      { id: 'tasks_completed', label: 'Tasks Completed', type: 'number', min: 0 },
      { id: 'blockers', label: 'Blockers / Issues', type: 'number', min: 0 },
      { id: 'progress_percent', label: 'Progress (%)', type: 'slider', min: 0, max: 100 },
      { id: 'confidence_score', label: 'Confidence Score', type: 'slider', min: 0, max: 100 },
      { id: 'notes', label: 'Notes / Exceptions', type: 'textarea', hint: 'Only add special blockers, escalations or nuances.' },
    ],
  },
};

export function getRoleReportTemplate(role?: Role): RoleReportTemplate {
  return baseTemplates[role || 'default'] ?? baseTemplates.default;
}

export function scoreOperationalHealth(formValues: Record<string, any>): number {
  const risk = formValues.operational_risk === 'critical' ? 5 : formValues.operational_risk === 'high' ? 4 : formValues.operational_risk === 'medium' ? 3 : formValues.operational_risk === 'low' ? 2 : 1;
  const confidence = Number(formValues.delivery_confidence ?? formValues.confidence_score ?? formValues.operational_health_score ?? 75);
  const blockerCount = Number(formValues.blockers_encountered ?? formValues.new_blockers ?? formValues.blockers ?? 0);
  const base = 70 + Math.min(20, Math.max(0, confidence / 5));
  const deduction = Math.min(50, blockerCount * 6 + risk * 4);
  return Math.max(25, Math.min(100, Math.round(base - deduction)));
}

export function summarizeRoleReport(template: RoleReportTemplate, formValues: Record<string, any>): string {
  const lines: string[] = [];
  for (const field of template.fields) {
    const value = formValues[field.id];
    if (value === undefined || value === null || value === '') continue;
    if (field.id === 'notes') continue;
    if (field.type === 'toggle') {
      lines.push(`${field.label}: ${value ? 'Yes' : 'No'}`);
    } else if (field.type === 'slider' || field.type === 'number') {
      lines.push(`${field.label}: ${value}`);
    } else if (field.type === 'select' && typeof value === 'string') {
      lines.push(`${field.label}: ${value}`);
    }
  }
  if (formValues.notes) {
    lines.push(`Notes: ${formValues.notes}`);
  }
  return lines.slice(0, 7).join(' · ');
}

export function buildTaskSuggestions(profile: Profile | null, tasks: Task[], projects: Project[]) {
  if (!profile) return [];
  const suggestions: string[] = [];
  const myTasks = tasks.filter((task) => task.assigned_to === profile.id);
  const activeProjects = projects.filter((project) => project.status === 'active');
  const blockedTasks = myTasks.filter((task) => task.status === 'blocked');
  const recentlyDone = myTasks.filter((task) => task.status === 'done' || task.completed_at?.startsWith(new Date().toISOString().slice(0, 10)));

  if (recentlyDone.length > 0) {
    suggestions.push(`Confirm ${recentlyDone.length} completed task${recentlyDone.length === 1 ? '' : 's'} have been closed.`);
  }

  if (blockedTasks.length > 0) {
    suggestions.push(`Resolve ${blockedTasks.length} blocked task${blockedTasks.length === 1 ? '' : 's'} before your next update.`);
  }

  if (activeProjects.length > 0) {
    suggestions.push(`Link this report to ${Math.min(3, activeProjects.length)} active project${activeProjects.length === 1 ? '' : 's'} for cross-functional visibility.`);
  }

  if (profile.role === 'manager' && myTasks.length === 0) {
    suggestions.push('Review team task assignments before submitting your managerial update.');
  }

  if (!suggestions.length) {
    suggestions.push('Use the structured fields to capture measurable progress and only add text for blockers or escalations.');
  }

  return suggestions.slice(0, 4);
}

export function buildRoleReportDefaults(role?: Role): Record<string, any> {
  const template = getRoleReportTemplate(role);
  return Object.fromEntries(template.fields.map((field) => {
    let value: any = '';
    if (field.type === 'toggle') value = false;
    if (field.type === 'number' || field.type === 'slider') value = 0;
    if (field.type === 'select') value = field.options?.[0] ?? '';
    return [field.id, value];
  }));
}

export function getVisibleRoleReportFields(template: RoleReportTemplate, values: Record<string, any>) {
  return template.fields.filter((field) => {
    if (typeof field.visibleWhen !== 'function') return true;
    return field.visibleWhen(values);
  });
}
