
/*
  # VAC-P: Sybella Systems Ltd - Core Schema

  ## Overview
  Full schema for the VAC-P remote team management platform.

  ## Tables Created
  1. `profiles` - Team member profiles linked to Supabase auth.users
  2. `projects` - Company projects with status tracking
  3. `customers` - Customer accounts
  4. `project_assignments` - Links team members to projects
  5. `tasks` - Tasks within projects
  6. `messages` - Team communication messages
  7. `channels` - Messaging channels/rooms
  8. `channel_members` - Members of each channel
  9. `accountability_reports` - Daily/weekly accountability updates
  10. `financial_records` - Budget and financial tracking
  11. `company_metrics` - Company-level KPIs and metrics

  ## Security
  - RLS enabled on all tables
  - Role-based access: admin, director, manager, developer, designer, qa, sales, hr, finance
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'developer' CHECK (role IN ('admin','director','manager','developer','designer','qa','sales','hr','finance')),
  avatar_url text DEFAULT '',
  department text DEFAULT '',
  phone text DEFAULT '',
  location text DEFAULT 'Kigali, Rwanda',
  bio text DEFAULT '',
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins and directors can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  );

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  company text DEFAULT '',
  country text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'churned')),
  total_contract_value numeric(12,2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers viewable by authenticated users"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales, admin, director, manager can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'sales')
    )
  );

CREATE POLICY "Sales, admin, director, manager can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'sales')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'sales')
    )
  );

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  customer_id uuid REFERENCES customers(id),
  budget numeric(12,2) DEFAULT 0,
  spent numeric(12,2) DEFAULT 0,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, director, manager can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "Admin, director, manager can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

-- Project assignments
CREATE TABLE IF NOT EXISTS project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_project text DEFAULT 'member',
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(project_id, member_id)
);

ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments viewable by authenticated users"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin, director, manager can manage assignments"
  ON project_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "Admin, director, manager can delete assignments"
  ON project_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Task owner, assignee, or admin can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = assigned_to OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager'))
  )
  WITH CHECK (
    auth.uid() = created_by OR
    auth.uid() = assigned_to OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager'))
  );

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  type text DEFAULT 'public' CHECK (type IN ('public', 'private', 'direct')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels viewable by authenticated users"
  ON channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create channels"
  ON channels FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Channel members
CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, member_id)
);

ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channel members viewable by authenticated users"
  ON channel_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can join channels"
  ON channel_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can leave channels"
  ON channel_members FOR DELETE
  TO authenticated
  USING (auth.uid() = member_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'report', 'escalation')),
  parent_id uuid REFERENCES messages(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by authenticated users"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Message owners can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Accountability reports
CREATE TABLE IF NOT EXISTS accountability_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_type text DEFAULT 'daily' CHECK (report_type IN ('daily', 'weekly', 'monthly', 'sprint', 'milestone', 'escalation')),
  report_role text DEFAULT 'manager',
  department text DEFAULT '',
  template text DEFAULT 'structured' CHECK (template IN ('structured', 'legacy')),
  completed_tasks text DEFAULT '',
  planned_tasks text DEFAULT '',
  blockers text DEFAULT '',
  notes text DEFAULT '',
  summary text DEFAULT '',
  report_data jsonb DEFAULT '{}'::jsonb,
  kpi_snapshot jsonb DEFAULT '{}'::jsonb,
  related_project_ids uuid[] DEFAULT '{}',
  related_task_ids uuid[] DEFAULT '{}',
  operational_health int DEFAULT 75,
  confidence_score int DEFAULT 75,
  risk_level text DEFAULT 'normal' CHECK (risk_level IN ('normal', 'low', 'medium', 'high', 'critical')),
  review_notes text DEFAULT '',
  approval_workflow_id uuid REFERENCES approval_workflows(id),
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'pending_approval', 'reviewed', 'approved', 'flagged')),
  reviewed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE accountability_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports viewable by authenticated users"
  ON accountability_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can submit their own reports"
  ON accountability_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

CREATE POLICY "Members can update their own reports, managers can review"
  ON accountability_reports FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = member_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager'))
  )
  WITH CHECK (
    auth.uid() = member_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager'))
  );

-- Financial records
CREATE TABLE IF NOT EXISTS financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'budget', 'invoice')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  category text DEFAULT '',
  project_id uuid REFERENCES projects(id),
  description text DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance, admin, director can view financial records"
  ON financial_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'finance'))
  );

CREATE POLICY "Finance, admin, director can insert financial records"
  ON financial_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

CREATE POLICY "Finance, admin, director can update financial records"
  ON financial_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

-- Company metrics
CREATE TABLE IF NOT EXISTS company_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric(15,2) NOT NULL DEFAULT 0,
  metric_type text DEFAULT 'general',
  period text DEFAULT '',
  recorded_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  notes text DEFAULT ''
);

ALTER TABLE company_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and director can view metrics"
  ON company_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'finance'))
  );

CREATE POLICY "Admin and director can manage metrics"
  ON company_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'task', 'message')),
  is_read boolean DEFAULT false,
  link text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'developer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accountability_member ON accountability_reports(member_id);
CREATE INDEX IF NOT EXISTS idx_accountability_date ON accountability_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_accountability_report_type ON accountability_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_accountability_operational_health ON accountability_reports(operational_health);
CREATE INDEX IF NOT EXISTS idx_accountability_status ON accountability_reports(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- =============================================================
-- VAC-P Features: Shares, Wiki, Repo Links, Leave, Budget, Audit
-- (Ported from local vac-p Downloads/vac-p version)
-- =============================================================

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

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- SUPERADMIN check helper is done inline via profiles.role

-- shares + ownership (SUPERADMIN only)
CREATE POLICY "shares_select_superadmin_only"
ON shares FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "shares_insert_superadmin_only"
ON shares FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "ownership_select_superadmin_only"
ON ownership_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "ownership_insert_superadmin_only"
ON ownership_records FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- wiki_pages
CREATE POLICY "wiki_pages_select_published_or_superadmin"
ON wiki_pages FOR SELECT
USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR created_by_auth_user_id = auth.uid()
);

CREATE POLICY "wiki_pages_insert_own_or_superadmin"
ON wiki_pages FOR INSERT
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "wiki_pages_update_own_or_superadmin"
ON wiki_pages FOR UPDATE
USING (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- repo_links
CREATE POLICY "repo_links_select_published_or_superadmin"
ON repo_links FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR created_by_auth_user_id = auth.uid()
);

CREATE POLICY "repo_links_insert_own_or_superadmin"
ON repo_links FOR INSERT
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "repo_links_update_own_or_superadmin"
ON repo_links FOR UPDATE
USING (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  created_by_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- leave_requests
CREATE POLICY "leave_requests_select_own_or_superadmin"
ON leave_requests FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "leave_requests_insert_own_or_superadmin"
ON leave_requests FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- budget_proposals
CREATE POLICY "budget_proposals_select_own_or_superadmin"
ON budget_proposals FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "budget_proposals_insert_own_or_superadmin"
ON budget_proposals FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- approval_workflows
CREATE POLICY "approval_workflows_select_reviewer_or_superadmin"
ON approval_workflows FOR SELECT
USING (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "approval_workflows_insert_superadmin_only"
ON approval_workflows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "approval_workflows_update_reviewer_or_superadmin"
ON approval_workflows FOR UPDATE
USING (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  reviewer_auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- audit_logs
CREATE POLICY "audit_logs_select_own_or_superadmin"
ON audit_logs FOR SELECT
USING (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "audit_logs_insert_superadmin_or_actor"
ON audit_logs FOR INSERT
WITH CHECK (
  auth_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

