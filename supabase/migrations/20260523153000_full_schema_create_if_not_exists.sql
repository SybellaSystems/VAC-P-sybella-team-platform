/*
  Full VAC-P schema consolidation
  - Creates tables if they do not already exist
  - Enables RLS on all app tables
  - Adds backend-linked tables and policies
  - Safe to run without dropping existing data
*/

CREATE SCHEMA IF NOT EXISTS public;
SET search_path = public, auth;

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'developer' CHECK (role IN ('admin', 'director', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr', 'finance', 'legal_counsel', 'marketing_manager')),
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

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins and directors can update any profile" ON profiles;
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

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
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

DROP POLICY IF EXISTS "Customers viewable by authenticated users" ON customers;
CREATE POLICY "Customers viewable by authenticated users"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Sales, admin, director, manager can insert customers" ON customers;
CREATE POLICY "Sales, admin, director, manager can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'sales')
    )
  );

DROP POLICY IF EXISTS "Sales, admin, director, manager can update customers" ON customers;
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

DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON projects;
CREATE POLICY "Projects viewable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin, director, manager can insert projects" ON projects;
CREATE POLICY "Admin, director, manager can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admin, director, manager can update projects" ON projects;
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

DROP POLICY IF EXISTS "Assignments viewable by authenticated users" ON project_assignments;
CREATE POLICY "Assignments viewable by authenticated users"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admin, director, manager can manage assignments" ON project_assignments;
CREATE POLICY "Admin, director, manager can manage assignments"
  ON project_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admin, director, manager can delete assignments" ON project_assignments;
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
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'started', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks viewable by authenticated users" ON tasks;
CREATE POLICY "Tasks viewable by authenticated users"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Task owner, assignee, or admin can update tasks" ON tasks;
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

DROP POLICY IF EXISTS "Channels viewable by authenticated users" ON channels;
CREATE POLICY "Channels viewable by authenticated users"
  ON channels FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;
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

DROP POLICY IF EXISTS "Channel members viewable by authenticated users" ON channel_members;
CREATE POLICY "Channel members viewable by authenticated users"
  ON channel_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can join channels" ON channel_members;
CREATE POLICY "Authenticated users can join channels"
  ON channel_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Members can leave channels" ON channel_members;
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

DROP POLICY IF EXISTS "Messages viewable by authenticated users" ON messages;
CREATE POLICY "Messages viewable by authenticated users"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
CREATE POLICY "Authenticated users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Message owners can update their messages" ON messages;
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

DROP POLICY IF EXISTS "Reports viewable by authenticated users" ON accountability_reports;
CREATE POLICY "Reports viewable by authenticated users"
  ON accountability_reports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can submit their own reports" ON accountability_reports;
CREATE POLICY "Members can submit their own reports"
  ON accountability_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Members can update their own reports, managers can review" ON accountability_reports;
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

DROP POLICY IF EXISTS "Finance, admin, director can view financial records" ON financial_records;
CREATE POLICY "Finance, admin, director can view financial records"
  ON financial_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'finance'))
  );

DROP POLICY IF EXISTS "Finance, admin, director can insert financial records" ON financial_records;
CREATE POLICY "Finance, admin, director can insert financial records"
  ON financial_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

DROP POLICY IF EXISTS "Finance, admin, director can update financial records" ON financial_records;
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

DROP POLICY IF EXISTS "Admin and director can view metrics" ON company_metrics;
CREATE POLICY "Admin and director can view metrics"
  ON company_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'finance'))
  );

DROP POLICY IF EXISTS "Admin and director can manage metrics" ON company_metrics;
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

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Shares table
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

ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shares_select_superadmin_only" ON shares;
DROP POLICY IF EXISTS "shares_select_finance_admin_director" ON shares;
CREATE POLICY "shares_select_finance_admin_director"
  ON shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

DROP POLICY IF EXISTS "shares_insert_superadmin_only" ON shares;
DROP POLICY IF EXISTS "shares_insert_admin" ON shares;
CREATE POLICY "shares_insert_admin"
  ON shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Ownership records
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

ALTER TABLE ownership_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ownership_select_superadmin_only" ON ownership_records;
DROP POLICY IF EXISTS "ownership_select_scope" ON ownership_records;
DROP POLICY IF EXISTS "ownership_insert_superadmin_only" ON ownership_records;
CREATE POLICY "ownership_select_scope"
  ON ownership_records FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

DROP POLICY IF EXISTS "ownership_insert_admin" ON ownership_records;
CREATE POLICY "ownership_insert_admin"
  ON ownership_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Wiki pages
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

ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wiki_pages_select_published_or_superadmin" ON wiki_pages;
CREATE POLICY "wiki_pages_select_published_or_superadmin"
  ON wiki_pages FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR created_by_auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "wiki_pages_insert_own_or_superadmin" ON wiki_pages;
DROP POLICY IF EXISTS "wiki_pages_insert_authors" ON wiki_pages;
CREATE POLICY "wiki_pages_insert_authors"
  ON wiki_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  );

DROP POLICY IF EXISTS "wiki_pages_update_own_or_superadmin" ON wiki_pages;
DROP POLICY IF EXISTS "wiki_pages_update_authors" ON wiki_pages;
CREATE POLICY "wiki_pages_update_authors"
  ON wiki_pages FOR UPDATE
  TO authenticated
  USING (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  )
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  );

-- Repo links
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

ALTER TABLE repo_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repo_links_select_published_or_superadmin" ON repo_links;
DROP POLICY IF EXISTS "repo_links_select_authenticated" ON repo_links;
CREATE POLICY "repo_links_select_authenticated"
  ON repo_links FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "repo_links_insert_own_or_superadmin" ON repo_links;
DROP POLICY IF EXISTS "repo_links_insert_scope" ON repo_links;
CREATE POLICY "repo_links_insert_scope"
  ON repo_links FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager', 'developer')
    )
  );

DROP POLICY IF EXISTS "repo_links_update_own_or_superadmin" ON repo_links;
DROP POLICY IF EXISTS "repo_links_update_scope" ON repo_links;
CREATE POLICY "repo_links_update_scope"
  ON repo_links FOR UPDATE
  TO authenticated
  USING (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager')
    )
  )
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager')
    )
  );

-- Leave requests
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

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_select_own_or_superadmin" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_select_scope" ON leave_requests;
CREATE POLICY "leave_requests_select_scope"
  ON leave_requests FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager', 'finance')
    )
  );

DROP POLICY IF EXISTS "leave_requests_update_hr_or_admin" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_manager_escalation" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_approvers" ON leave_requests;
CREATE POLICY "leave_requests_update_approvers"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager')
    )
  );

-- Budget proposals
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

ALTER TABLE budget_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_proposals_select_own_or_superadmin" ON budget_proposals;
DROP POLICY IF EXISTS "budget_proposals_select_scope" ON budget_proposals;
CREATE POLICY "budget_proposals_select_scope"
  ON budget_proposals FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

DROP POLICY IF EXISTS "budget_proposals_insert_own_or_superadmin" ON budget_proposals;
DROP POLICY IF EXISTS "budget_proposals_insert_scope" ON budget_proposals;
CREATE POLICY "budget_proposals_insert_scope"
  ON budget_proposals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  );

DROP POLICY IF EXISTS "budget_proposals_update_scope" ON budget_proposals;
CREATE POLICY "budget_proposals_update_scope"
  ON budget_proposals FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  );

-- Approval workflows
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

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_workflows_select_reviewer_or_superadmin" ON approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_select_scope" ON approval_workflows;
CREATE POLICY "approval_workflows_select_scope"
  ON approval_workflows FOR SELECT
  TO authenticated
  USING (
    reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM budget_proposals bp
      WHERE bp.id = approval_workflows.budget_proposal_id
      AND bp.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('director', 'finance', 'manager')
    )
  );

DROP POLICY IF EXISTS "approval_workflows_insert_superadmin_only" ON approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_insert_scope" ON approval_workflows;
CREATE POLICY "approval_workflows_insert_scope"
  ON approval_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM budget_proposals bp
      WHERE bp.id = budget_proposal_id AND bp.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('director', 'finance')
    )
  );

DROP POLICY IF EXISTS "approval_workflows_update_reviewer_or_superadmin" ON approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_update_scope" ON approval_workflows;
DROP POLICY IF EXISTS "approval_workflows_update_by_role" ON approval_workflows;
CREATE POLICY "approval_workflows_update_by_role"
  ON approval_workflows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      required_role IS NOT NULL
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = required_role)
    )
    OR reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('director', 'finance'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      required_role IS NOT NULL
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = required_role)
    )
    OR reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('director', 'finance'))
  );

-- Audit logs
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

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_own_or_superadmin" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_scope" ON audit_logs;
CREATE POLICY "audit_logs_select_scope"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  );

DROP POLICY IF EXISTS "audit_logs_insert_superadmin_or_actor" ON audit_logs;
CREATE POLICY "audit_logs_insert_superadmin_or_actor"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Task subtasks
CREATE TABLE IF NOT EXISTS task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  sort_order int NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_subtasks_select_auth" ON task_subtasks;
CREATE POLICY "task_subtasks_select_auth"
  ON task_subtasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_subtasks_insert_auth" ON task_subtasks;
CREATE POLICY "task_subtasks_insert_auth"
  ON task_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "task_subtasks_update_managers_or_task_party" ON task_subtasks;
CREATE POLICY "task_subtasks_update_managers_or_task_party"
  ON task_subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  );

DROP POLICY IF EXISTS "task_subtasks_delete_managers_or_task_party" ON task_subtasks;
CREATE POLICY "task_subtasks_delete_managers_or_task_party"
  ON task_subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  );

-- Cross-feature project links
CREATE TABLE IF NOT EXISTS project_feature_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_type text NOT NULL CHECK (
    feature_type IN ('customer', 'financial_record', 'budget_proposal', 'wiki_page', 'repo_link')
  ),
  feature_id uuid NOT NULL,
  note text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, feature_type, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_project_feature_links_project ON project_feature_links(project_id);

ALTER TABLE project_feature_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_feature_links_select_auth" ON project_feature_links;
CREATE POLICY "project_feature_links_select_auth"
  ON project_feature_links FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "project_feature_links_insert_leads" ON project_feature_links;
CREATE POLICY "project_feature_links_insert_leads"
  ON project_feature_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

DROP POLICY IF EXISTS "project_feature_links_update_leads" ON project_feature_links;
CREATE POLICY "project_feature_links_update_leads"
  ON project_feature_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

DROP POLICY IF EXISTS "project_feature_links_delete_leads" ON project_feature_links;
CREATE POLICY "project_feature_links_delete_leads"
  ON project_feature_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

-- Share allocations
CREATE TABLE IF NOT EXISTS share_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  allocation_type text NOT NULL DEFAULT 'internal' CHECK (allocation_type IN ('internal', 'external')),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  external_party_name text,
  external_party_email text,
  units numeric(20,6) NOT NULL DEFAULT 0,
  share_value numeric(20,6),
  notes text DEFAULT '',
  allocated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT share_alloc_external_chk CHECK (
    allocation_type = 'internal' OR (external_party_name IS NOT NULL AND external_party_name <> '')
  )
);

ALTER TABLE share_allocations DROP CONSTRAINT IF EXISTS share_alloc_external_chk;
ALTER TABLE share_allocations ADD CONSTRAINT share_alloc_body_chk CHECK (
  (allocation_type = 'internal' AND profile_id IS NOT NULL)
  OR (allocation_type = 'external' AND COALESCE(btrim(external_party_name), '') <> '')
);

CREATE INDEX IF NOT EXISTS idx_share_alloc_share ON share_allocations(share_id);
CREATE INDEX IF NOT EXISTS idx_share_alloc_profile ON share_allocations(profile_id);

ALTER TABLE share_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "share_alloc_select_admin_director_finance" ON share_allocations;
CREATE POLICY "share_alloc_select_admin_director_finance"
  ON share_allocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "share_alloc_insert_admin" ON share_allocations;
CREATE POLICY "share_alloc_insert_admin"
  ON share_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "share_alloc_update_admin" ON share_allocations;
CREATE POLICY "share_alloc_update_admin"
  ON share_allocations FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "share_alloc_delete_admin" ON share_allocations;
CREATE POLICY "share_alloc_delete_admin"
  ON share_allocations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- HR candidates
CREATE TABLE IF NOT EXISTS hr_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role_applied text DEFAULT '',
  stage text NOT NULL DEFAULT 'applied' CHECK (
    stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')
  ),
  notes text DEFAULT '',
  assigned_hr uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_candidates_select" ON hr_candidates;
CREATE POLICY "hr_candidates_select"
  ON hr_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

DROP POLICY IF EXISTS "hr_candidates_insert" ON hr_candidates;
CREATE POLICY "hr_candidates_insert"
  ON hr_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr'))
  );

DROP POLICY IF EXISTS "hr_candidates_update" ON hr_candidates;
CREATE POLICY "hr_candidates_update"
  ON hr_candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

-- HR performance reviews
CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id),
  period_label text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  goals text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_reviews_select" ON hr_performance_reviews;
CREATE POLICY "hr_reviews_select"
  ON hr_performance_reviews FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

DROP POLICY IF EXISTS "hr_reviews_insert" ON hr_performance_reviews;
CREATE POLICY "hr_reviews_insert"
  ON hr_performance_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  );

DROP POLICY IF EXISTS "hr_reviews_update" ON hr_performance_reviews;
CREATE POLICY "hr_reviews_update"
  ON hr_performance_reviews FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR member_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    OR member_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  );

-- HR onboarding tasks
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  is_done boolean DEFAULT false,
  due_date date,
  assigned_to uuid REFERENCES profiles(id),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_onb_select" ON hr_onboarding_tasks;
CREATE POLICY "hr_onb_select"
  ON hr_onboarding_tasks FOR SELECT
  TO authenticated
  USING (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

DROP POLICY IF EXISTS "hr_onb_insert" ON hr_onboarding_tasks;
CREATE POLICY "hr_onb_insert"
  ON hr_onboarding_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

DROP POLICY IF EXISTS "hr_onb_update" ON hr_onboarding_tasks;
CREATE POLICY "hr_onb_update"
  ON hr_onboarding_tasks FOR UPDATE
  TO authenticated
  USING (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  )
  WITH CHECK (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

-- Project budget links
CREATE TABLE IF NOT EXISTS project_budget_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_proposal_id uuid NOT NULL REFERENCES budget_proposals(id) ON DELETE CASCADE,
  link_role text DEFAULT 'allocation',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, budget_proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_project_budget_project ON project_budget_links(project_id);

ALTER TABLE project_budget_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pbl_select_auth" ON project_budget_links;
CREATE POLICY "pbl_select_auth"
  ON project_budget_links FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "pbl_insert_leads" ON project_budget_links;
CREATE POLICY "pbl_insert_leads"
  ON project_budget_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

DROP POLICY IF EXISTS "pbl_delete_leads" ON project_budget_links;
CREATE POLICY "pbl_delete_leads"
  ON project_budget_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

-- Role enum update
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'admin', 'director', 'manager', 'developer', 'designer', 'qa',
    'sales', 'hr', 'finance', 'legal_counsel', 'marketing_manager'
  )
);

-- Ensure task status allows started/cancelled
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
  status IN ('todo', 'started', 'in_progress', 'review', 'done', 'blocked', 'cancelled')
);

-- User trigger
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
