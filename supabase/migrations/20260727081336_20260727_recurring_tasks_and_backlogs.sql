/*
# Recurring Accountability Tasks & Role Backlogs

## Overview
Creates tables for recurring operational responsibilities and role-specific backlogs
so no employee remains idle. When no urgent assignments exist, the system generates
work from role-specific backlogs (improve documentation, review policies, etc.).

## New Tables
1. `role_backlog_items` - Pre-defined recurring tasks per role (e.g. "Review policies",
   "Update knowledge base"). These are templates that generate actual tasks.
2. `recurring_tasks` - Generated recurring tasks assigned to users from the backlog.
   Tracks completion and next due date.

## Security
- RLS enabled on both tables
- All authenticated users can read backlog items
- Admin/director/manager/HR can manage backlog items
- Users can CRUD their own recurring tasks; managers can read all
*/

CREATE TABLE IF NOT EXISTS role_backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'improvement' CHECK (category IN ('documentation','improvement','learning','review','support','administrative','research')),
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily','weekly','biweekly','monthly','quarterly')),
  estimated_hours numeric(4,1) DEFAULT 1,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE role_backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Backlog items viewable by authenticated" ON role_backlog_items;
CREATE POLICY "Backlog items viewable by authenticated" ON role_backlog_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Backlog items insertable by managers" ON role_backlog_items;
CREATE POLICY "Backlog items insertable by managers" ON role_backlog_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Backlog items updatable by managers" ON role_backlog_items;
CREATE POLICY "Backlog items updatable by managers" ON role_backlog_items
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Backlog items deletable by admins" ON role_backlog_items;
CREATE POLICY "Backlog items deletable by admins" ON role_backlog_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  backlog_item_id uuid REFERENCES role_backlog_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'improvement',
  frequency text DEFAULT 'weekly',
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  completed_at timestamptz,
  estimated_hours numeric(4,1) DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring tasks viewable by managers" ON recurring_tasks;
CREATE POLICY "Recurring tasks viewable by managers" ON recurring_tasks
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Recurring tasks insertable by owner" ON recurring_tasks;
CREATE POLICY "Recurring tasks insertable by owner" ON recurring_tasks
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Recurring tasks updatable by owner" ON recurring_tasks;
CREATE POLICY "Recurring tasks updatable by owner" ON recurring_tasks
  FOR UPDATE TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  ) WITH CHECK (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Recurring tasks deletable by owner" ON recurring_tasks;
CREATE POLICY "Recurring tasks deletable by owner" ON recurring_tasks
  FOR DELETE TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

CREATE INDEX IF NOT EXISTS idx_recurring_member ON recurring_tasks(member_id);
CREATE INDEX IF NOT EXISTS idx_recurring_status ON recurring_tasks(status);
CREATE INDEX IF NOT EXISTS idx_recurring_date ON recurring_tasks(assigned_date);

-- ============================================================
-- Seed role backlog items for all roles
-- ============================================================
INSERT INTO role_backlog_items (role, title, description, category, frequency, estimated_hours, sort_order)
VALUES
  -- Developer
  ('developer', 'Improve code documentation', 'Review and update inline documentation for recently completed features', 'documentation', 'weekly', 2, 0),
  ('developer', 'Review pull requests', 'Review pending PRs from team members', 'review', 'daily', 1, 1),
  ('developer', 'Refactor technical debt', 'Address technical debt identified in recent sprints', 'improvement', 'biweekly', 3, 2),
  ('developer', 'Complete learning objectives', 'Work on assigned learning paths and courses', 'learning', 'weekly', 2, 3),
  ('developer', 'Review previous work', 'Review code written in previous sprints for improvements', 'review', 'monthly', 2, 4),
  -- Designer
  ('designer', 'Update design system', 'Review and update the design system components', 'documentation', 'biweekly', 2, 0),
  ('designer', 'Review design feedback', 'Review and address feedback on recent designs', 'review', 'daily', 1, 1),
  ('designer', 'Improve design processes', 'Identify and implement process improvements', 'improvement', 'monthly', 2, 2),
  ('designer', 'Complete learning objectives', 'Work on design learning and skill development', 'learning', 'weekly', 2, 3),
  ('designer', 'Update knowledge base', 'Document design decisions and guidelines', 'documentation', 'weekly', 1, 4),
  -- QA
  ('qa', 'Review test coverage', 'Analyze test coverage and identify gaps', 'review', 'weekly', 2, 0),
  ('qa', 'Improve test automation', 'Enhance automated test suites', 'improvement', 'biweekly', 3, 1),
  ('qa', 'Update test documentation', 'Document test cases and procedures', 'documentation', 'weekly', 1, 2),
  ('qa', 'Complete learning objectives', 'Work on QA learning and certifications', 'learning', 'weekly', 2, 3),
  ('qa', 'Review previous test results', 'Analyze past test cycles for patterns', 'review', 'monthly', 1, 4),
  -- Manager
  ('manager', 'Review team performance', 'One-on-one reviews with team members', 'review', 'weekly', 3, 0),
  ('manager', 'Improve team processes', 'Identify and implement process improvements', 'improvement', 'biweekly', 2, 1),
  ('manager', 'Update project documentation', 'Ensure project docs are current', 'documentation', 'weekly', 1, 2),
  ('manager', 'Analyze team metrics', 'Review productivity and performance metrics', 'review', 'weekly', 2, 3),
  ('manager', 'Support team members', 'Provide guidance and support to team', 'support', 'daily', 1, 4),
  -- Sales
  ('sales', 'Research prospects', 'Research potential leads and companies', 'research', 'daily', 1, 0),
  ('sales', 'Update CRM', 'Ensure CRM data is current and accurate', 'administrative', 'daily', 0.5, 1),
  ('sales', 'Review sales metrics', 'Analyze conversion rates and pipeline', 'review', 'weekly', 1, 2),
  ('sales', 'Complete learning objectives', 'Sales training and skill development', 'learning', 'weekly', 1, 3),
  ('sales', 'Prepare sales templates', 'Create and refine sales materials', 'documentation', 'monthly', 2, 4),
  -- HR
  ('hr', 'Review HR policies', 'Review and update HR policies', 'review', 'monthly', 2, 0),
  ('hr', 'Update employee handbook', 'Keep handbook current', 'documentation', 'quarterly', 3, 1),
  ('hr', 'Analyze attendance metrics', 'Review attendance patterns', 'review', 'weekly', 1, 2),
  ('hr', 'Support employees', 'Address employee concerns and questions', 'support', 'daily', 1, 3),
  ('hr', 'Complete learning objectives', 'HR training and certifications', 'learning', 'weekly', 2, 4),
  -- Finance
  ('finance', 'Review financial processes', 'Identify process improvements', 'improvement', 'monthly', 2, 0),
  ('finance', 'Update financial documentation', 'Document procedures and controls', 'documentation', 'monthly', 1, 1),
  ('finance', 'Analyze financial metrics', 'Review budget vs actual, cash flow', 'review', 'weekly', 2, 2),
  ('finance', 'Complete learning objectives', 'Finance training and certifications', 'learning', 'weekly', 1, 3),
  ('finance', 'Review compliance', 'Ensure financial compliance', 'review', 'monthly', 2, 4),
  -- Legal
  ('legal_counsel', 'Review contracts', 'Review and update contract templates', 'review', 'weekly', 2, 0),
  ('legal_counsel', 'Monitor regulatory changes', 'Track regulatory developments', 'research', 'weekly', 2, 1),
  ('legal_counsel', 'Update legal documentation', 'Update policies and legal docs', 'documentation', 'biweekly', 2, 2),
  ('legal_counsel', 'Conduct compliance reviews', 'Review compliance across departments', 'review', 'monthly', 3, 3),
  ('legal_counsel', 'Monitor intellectual property', 'Review IP portfolio', 'review', 'monthly', 1, 4),
  ('legal_counsel', 'Improve legal templates', 'Refine standard legal templates', 'improvement', 'monthly', 2, 5),
  -- Marketing
  ('marketing_manager', 'Analyze campaign metrics', 'Review performance of active campaigns', 'review', 'weekly', 2, 0),
  ('marketing_manager', 'Update content calendar', 'Plan and schedule content', 'documentation', 'weekly', 1, 1),
  ('marketing_manager', 'Research industry trends', 'Monitor market and competitor activity', 'research', 'weekly', 2, 2),
  ('marketing_manager', 'Complete learning objectives', 'Marketing training and skill development', 'learning', 'weekly', 1, 3),
  ('marketing_manager', 'Improve marketing processes', 'Identify process improvements', 'improvement', 'monthly', 2, 4),
  -- Customer Support
  ('customer_support', 'Review support metrics', 'Analyze ticket resolution times', 'review', 'weekly', 1, 0),
  ('customer_support', 'Update knowledge base', 'Document common solutions', 'documentation', 'weekly', 2, 1),
  ('customer_support', 'Complete learning objectives', 'Product training and skill development', 'learning', 'weekly', 1, 2),
  ('customer_support', 'Review customer feedback', 'Analyze feedback trends', 'review', 'biweekly', 1, 3),
  ('customer_support', 'Improve support processes', 'Identify process improvements', 'improvement', 'monthly', 2, 4),
  -- Operations
  ('operations', 'Review operational metrics', 'Analyze operational efficiency', 'review', 'weekly', 2, 0),
  ('operations', 'Update process documentation', 'Document operational procedures', 'documentation', 'biweekly', 2, 1),
  ('operations', 'Complete learning objectives', 'Operations training and development', 'learning', 'weekly', 1, 2),
  ('operations', 'Improve internal processes', 'Identify and implement improvements', 'improvement', 'monthly', 2, 3),
  ('operations', 'Support colleagues', 'Assist other departments', 'support', 'weekly', 1, 4),
  -- Admin
  ('admin', 'Review system health', 'Monitor system performance and security', 'review', 'daily', 1, 0),
  ('admin', 'Update system documentation', 'Document configurations and procedures', 'documentation', 'weekly', 2, 1),
  ('admin', 'Review access permissions', 'Audit user access and permissions', 'review', 'monthly', 2, 2),
  ('admin', 'Complete learning objectives', 'System administration training', 'learning', 'weekly', 1, 3),
  ('admin', 'Improve system processes', 'Identify automation opportunities', 'improvement', 'monthly', 2, 4),
  -- Director
  ('director', 'Review department performance', 'Analyze department metrics', 'review', 'weekly', 2, 0),
  ('director', 'Update strategic documentation', 'Document strategic decisions', 'documentation', 'monthly', 2, 1),
  ('director', 'Research industry developments', 'Monitor industry trends', 'research', 'weekly', 2, 2),
  ('director', 'Complete learning objectives', 'Leadership development', 'learning', 'weekly', 2, 3),
  ('director', 'Support managers', 'Mentor and guide department managers', 'support', 'weekly', 2, 4),
  -- CEO
  ('ceo', 'Review company performance', 'Analyze overall company metrics', 'review', 'weekly', 2, 0),
  ('ceo', 'Update strategic plans', 'Refine company strategy', 'documentation', 'monthly', 3, 1),
  ('ceo', 'Research growth opportunities', 'Identify new market opportunities', 'research', 'weekly', 2, 2),
  ('ceo', 'Complete learning objectives', 'Executive development', 'learning', 'weekly', 2, 3),
  ('ceo', 'Support leadership team', 'Guide and mentor directors', 'support', 'weekly', 2, 4)
ON CONFLICT DO NOTHING;
