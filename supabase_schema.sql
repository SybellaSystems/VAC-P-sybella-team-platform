-- Visionary Admin Core Platform (VAC-P)
-- Supabase Schema Reference

-- NOTE:
-- This file is intended to be applied to Supabase.
-- It implements a HYBRID identity model:
--   - user_id: UUID kept for compatibility with existing app code
--   - auth_user_id: FK -> auth.users(id) for RLS-ready access control
-- Decision enforced in this schema:
--   - rows with unknown/NULL auth_user_id are NOT readable by normal users
--   - only SUPERADMIN can read all rows

-- ==========================
-- Identity + Profiles
-- ==========================

-- Workspace Modules
CREATE TABLE IF NOT EXISTS workspace_modules (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Records
CREATE TABLE IF NOT EXISTS workspace_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT REFERENCES workspace_modules(key),

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  event_type TEXT NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  role TEXT DEFAULT 'VIEWER',
  avatar_url TEXT,
  last_login TIMESTAMPTZ
);

-- ==========================
-- Core supporting objects (minimal)
-- ==========================

-- Messages (required by Chat.tsx)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  created_task_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Projects (needed for Projects page enhancements)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_user_id UUID,
  owner_auth_user_id UUID REFERENCES auth.users(id),

  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  start_date DATE,
  end_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'STARTED', -- STARTED/IN_PROGRESS/CANCELLED/COMPLETED
  priority INT DEFAULT 0,

  assigned_user_id UUID,
  assigned_auth_user_id UUID REFERENCES auth.users(id),

  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_by_user_id UUID,
  created_by_auth_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- Task Subtasks
CREATE TABLE IF NOT EXISTS task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  status TEXT NOT NULL DEFAULT 'STARTED',

  assigned_user_id UUID,
  assigned_auth_user_id UUID REFERENCES auth.users(id),

  started_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================
-- Shares & Ownership
-- ==========================

CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'VAC-P',

  share_class TEXT DEFAULT 'COMMON',
  total_units NUMERIC(20,6) DEFAULT 0,
  issued_units NUMERIC(20,6) DEFAULT 0,
  par_value NUMERIC(20,6) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ownership_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES shares(id) ON DELETE CASCADE,

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  units NUMERIC(20,6) NOT NULL DEFAULT 0,
  share_value NUMERIC(20,6),
  market_cap NUMERIC(30,6),

  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT ownership_unique UNIQUE (share_id, auth_user_id)
);

-- ==========================
-- Wiki / Knowledge Base
-- ==========================

CREATE TABLE IF NOT EXISTS wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,

  created_by_user_id UUID,
  created_by_auth_user_id UUID REFERENCES auth.users(id),

  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================
-- Repo / Document Links
-- ==========================

CREATE TABLE IF NOT EXISTS repo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'DOCUMENT',

  created_by_user_id UUID,
  created_by_auth_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================
-- Leave Management
-- ==========================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  leave_type TEXT NOT NULL DEFAULT 'VACATION',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',

  requested_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,

  decided_by_user_id UUID,
  decided_by_auth_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT leave_date_valid CHECK (end_date >= start_date)
);

-- ==========================
-- Budget Proposals & Approval Workflows
-- ==========================

CREATE TABLE IF NOT EXISTS budget_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  title TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',

  amount NUMERIC(20,6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',

  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  budget_proposal_id UUID REFERENCES budget_proposals(id) ON DELETE CASCADE,

  step_name TEXT NOT NULL,
  step_order INT NOT NULL,

  required_role TEXT,

  reviewer_user_id UUID,
  reviewer_auth_user_id UUID REFERENCES auth.users(id),

  status TEXT NOT NULL DEFAULT 'PENDING',
  decision_note TEXT,
  decided_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (budget_proposal_id, step_order)
);

-- ==========================
-- Audit Logs
-- ==========================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID,
  auth_user_id UUID REFERENCES auth.users(id),

  actor_role TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,

  action TEXT,
  details TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================
-- Row Level Security (RLS)
-- ==========================

-- Enable RLS
ALTER TABLE workspace_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN check helper is done inline via user_profiles.role
-- Hybrid policy: readable ONLY when auth_user_id matches auth.uid().
-- Anonymous/NULL auth_user_id is NOT readable.

-- workspace_records
CREATE POLICY "workspace_records_select_own_or_superadmin"
ON workspace_records FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "workspace_records_insert_own_or_superadmin"
ON workspace_records FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- activity_logs
CREATE POLICY "activity_logs_select_own_or_superadmin"
ON activity_logs FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "activity_logs_insert_own_or_superadmin"
ON activity_logs FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- user_profiles
CREATE POLICY "user_profiles_select_own_or_superadmin"
ON user_profiles FOR SELECT
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "user_profiles_update_own_or_superadmin"
ON user_profiles FOR UPDATE
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- messages
CREATE POLICY "messages_select_own_or_superadmin"
ON messages FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "messages_insert_own_or_superadmin"
ON messages FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- projects
CREATE POLICY "projects_select_own_or_superadmin"
ON projects FOR SELECT
USING (
  owner_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "projects_insert_own_or_superadmin"
ON projects FOR INSERT
WITH CHECK (
  owner_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "projects_update_own_or_superadmin"
ON projects FOR UPDATE
USING (
  owner_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  owner_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- tasks
CREATE POLICY "tasks_select_own_or_superadmin"
ON tasks FOR SELECT
USING (
  assigned_auth_user_id = auth.uid()
  OR created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "tasks_insert_own_or_superadmin"
ON tasks FOR INSERT
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "tasks_update_own_or_superadmin"
ON tasks FOR UPDATE
USING (
  created_by_auth_user_id = auth.uid()
  OR assigned_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR assigned_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- task_subtasks
CREATE POLICY "task_subtasks_select_own_or_superadmin"
ON task_subtasks FOR SELECT
USING (
  assigned_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = parent_task_id AND (t.created_by_auth_user_id = auth.uid() OR t.assigned_auth_user_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "task_subtasks_insert_own_or_superadmin"
ON task_subtasks FOR INSERT
WITH CHECK (
  assigned_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- shares + ownership
CREATE POLICY "shares_select_superadmin_only"
ON shares FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "shares_insert_superadmin_only"
ON shares FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "ownership_select_superadmin_only"
ON ownership_records FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "ownership_insert_superadmin_only"
ON ownership_records FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- wiki_pages
CREATE POLICY "wiki_pages_select_published_or_superadmin"
ON wiki_pages FOR SELECT
USING (
  is_published = true
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
  OR created_by_auth_user_id = auth.uid()
);

CREATE POLICY "wiki_pages_insert_own_or_superadmin"
ON wiki_pages FOR INSERT
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "wiki_pages_update_own_or_superadmin"
ON wiki_pages FOR UPDATE
USING (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- repo_links
CREATE POLICY "repo_links_select_published_or_superadmin"
ON repo_links FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
  OR created_by_auth_user_id = auth.uid()
);

CREATE POLICY "repo_links_insert_own_or_superadmin"
ON repo_links FOR INSERT
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "repo_links_update_own_or_superadmin"
ON repo_links FOR UPDATE
USING (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- leave_requests
CREATE POLICY "leave_requests_select_own_or_superadmin"
ON leave_requests FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "leave_requests_insert_own_or_superadmin"
ON leave_requests FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- budget_proposals
CREATE POLICY "budget_proposals_select_own_or_superadmin"
ON budget_proposals FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "budget_proposals_insert_own_or_superadmin"
ON budget_proposals FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- approval_workflows
CREATE POLICY "approval_workflows_select_reviewer_or_superadmin"
ON approval_workflows FOR SELECT
USING (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "approval_workflows_insert_superadmin_only"
ON approval_workflows FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "approval_workflows_update_reviewer_or_superadmin"
ON approval_workflows FOR UPDATE
USING (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
)
WITH CHECK (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

-- audit_logs
CREATE POLICY "audit_logs_select_own_or_superadmin"
ON audit_logs FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

CREATE POLICY "audit_logs_insert_superadmin_or_actor"
ON audit_logs FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'SUPERADMIN')
);

