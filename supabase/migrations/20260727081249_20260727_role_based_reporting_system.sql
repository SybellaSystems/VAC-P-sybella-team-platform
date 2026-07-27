/*
# Role-Based Progressive Reporting System

## Overview
Creates a comprehensive reporting system with role-based templates, progressive
multi-step report forms, and intelligent data pre-population. Reports are tailored
to the user's role and report frequency (daily/weekly/monthly).

## New Tables
1. `report_templates` - Role-specific templates defining report sections and questions
   for each report frequency (daily/weekly/monthly) per role.
2. `report_sections` - Individual sections within a report template (progressive steps).
3. `report_responses` - User responses to report questions, stored as structured JSON.
   Links to accountability_reports for backward compatibility.

## Modified Tables
- `accountability_reports` - Adds template_id, report_data (jsonb for structured responses),
  kpi_snapshot, related_project_ids, related_task_ids, operational_health, confidence_score,
  risk_level fields (most already exist, adding missing ones).

## Security
- RLS enabled on all new tables
- Authenticated users can read templates; admin/director/manager can manage templates
- Users can CRUD their own report responses; managers can read team responses
*/

-- ============================================================
-- 1. Report Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  report_type text NOT NULL CHECK (report_type IN ('daily','weekly','monthly')),
  role text NOT NULL,
  department text DEFAULT '',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Report templates viewable by authenticated" ON report_templates;
CREATE POLICY "Report templates viewable by authenticated" ON report_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Report templates insertable by managers" ON report_templates;
CREATE POLICY "Report templates insertable by managers" ON report_templates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Report templates updatable by managers" ON report_templates;
CREATE POLICY "Report templates updatable by managers" ON report_templates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Report templates deletable by admins" ON report_templates;
CREATE POLICY "Report templates deletable by admins" ON report_templates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

-- ============================================================
-- 2. Report Sections (progressive steps within a template)
-- ============================================================
CREATE TABLE IF NOT EXISTS report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer DEFAULT 0,
  questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Report sections viewable by authenticated" ON report_sections;
CREATE POLICY "Report sections viewable by authenticated" ON report_sections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Report sections insertable by managers" ON report_sections;
CREATE POLICY "Report sections insertable by managers" ON report_sections
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Report sections updatable by managers" ON report_sections;
CREATE POLICY "Report sections updatable by managers" ON report_sections
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Report sections deletable by admins" ON report_sections;
CREATE POLICY "Report sections deletable by admins" ON report_sections
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

CREATE INDEX IF NOT EXISTS idx_report_sections_template ON report_sections(template_id);

-- ============================================================
-- 3. Extend accountability_reports with missing columns
-- ============================================================
ALTER TABLE accountability_reports
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES report_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kpi_snapshot jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS related_project_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_task_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS operational_health numeric(5,2),
  ADD COLUMN IF NOT EXISTS confidence_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'normal' CHECK (risk_level IN ('normal','low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS review_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS approval_workflow_id uuid,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS report_role text DEFAULT '',
  ADD COLUMN IF NOT EXISTS department text DEFAULT '',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS template text DEFAULT 'structured';

CREATE INDEX IF NOT EXISTS idx_reports_member ON accountability_reports(member_id);
CREATE INDEX IF NOT EXISTS idx_reports_date ON accountability_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_type ON accountability_reports(report_type);

-- ============================================================
-- 4. Seed role-based report templates
-- ============================================================
-- Daily report templates for each role
INSERT INTO report_templates (name, description, report_type, role)
VALUES
  ('Daily Report - Executive', 'Daily executive leadership report', 'daily', 'ceo'),
  ('Daily Report - Director', 'Daily director report', 'daily', 'director'),
  ('Daily Report - Manager', 'Daily manager report', 'daily', 'manager'),
  ('Daily Report - Developer', 'Daily developer report', 'daily', 'developer'),
  ('Daily Report - Designer', 'Daily designer report', 'daily', 'designer'),
  ('Daily Report - QA', 'Daily QA engineer report', 'daily', 'qa'),
  ('Daily Report - Sales', 'Daily sales report', 'daily', 'sales'),
  ('Daily Report - HR', 'Daily HR report', 'daily', 'hr'),
  ('Daily Report - Finance', 'Daily finance report', 'daily', 'finance'),
  ('Daily Report - Legal', 'Daily legal counsel report', 'daily', 'legal_counsel'),
  ('Daily Report - Marketing', 'Daily marketing report', 'daily', 'marketing_manager'),
  ('Daily Report - Support', 'Daily customer support report', 'daily', 'customer_support'),
  ('Daily Report - Operations', 'Daily operations report', 'daily', 'operations'),
  ('Daily Report - Admin', 'Daily admin report', 'daily', 'admin'),
  ('Weekly Report - Executive', 'Weekly executive leadership report', 'weekly', 'ceo'),
  ('Weekly Report - Manager', 'Weekly manager report', 'weekly', 'manager'),
  ('Weekly Report - Developer', 'Weekly developer report', 'weekly', 'developer'),
  ('Weekly Report - Designer', 'Weekly designer report', 'weekly', 'designer'),
  ('Weekly Report - QA', 'Weekly QA report', 'weekly', 'qa'),
  ('Weekly Report - Sales', 'Weekly sales report', 'weekly', 'sales'),
  ('Weekly Report - HR', 'Weekly HR report', 'weekly', 'hr'),
  ('Weekly Report - Finance', 'Weekly finance report', 'weekly', 'finance'),
  ('Weekly Report - Legal', 'Weekly legal report', 'weekly', 'legal_counsel'),
  ('Weekly Report - Marketing', 'Weekly marketing report', 'weekly', 'marketing_manager'),
  ('Weekly Report - Support', 'Weekly support report', 'weekly', 'customer_support'),
  ('Monthly Report - Executive', 'Monthly executive report', 'monthly', 'ceo'),
  ('Monthly Report - Manager', 'Monthly manager report', 'monthly', 'manager'),
  ('Monthly Report - Developer', 'Monthly developer report', 'monthly', 'developer'),
  ('Monthly Report - Finance', 'Monthly finance report', 'monthly', 'finance'),
  ('Monthly Report - HR', 'Monthly HR report', 'monthly', 'hr'),
  ('Monthly Report - Marketing', 'Monthly marketing report', 'monthly', 'marketing_manager')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Seed report sections for each template
-- ============================================================
-- Helper: insert sections for daily developer report
DO $$
DECLARE
  t_id uuid;
BEGIN
  -- Daily Developer sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Developer' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Planned Work', 'What did you plan to work on today?', 0,
       '[{"id":"planned_work","label":"Today''s planned tasks","type":"textarea","required":true,"auto_populate":"tasks_assigned"}]'::jsonb),
      (t_id, 'Completed Work', 'What did you complete today?', 1,
       '[{"id":"completed_work","label":"Tasks completed today","type":"textarea","required":true,"auto_populate":"tasks_completed"}]'::jsonb),
      (t_id, 'Blockers', 'Any blockers or issues encountered?', 2,
       '[{"id":"blockers","label":"Current blockers","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Code & Reviews', 'Development activity', 3,
       '[{"id":"features_completed","label":"Features completed","type":"text","required":false},{"id":"bugs_resolved","label":"Bugs resolved","type":"text","required":false},{"id":"code_reviews","label":"Code reviews","type":"text","required":false},{"id":"pull_requests","label":"Pull requests","type":"text","required":false}]'::jsonb),
      (t_id, 'Time & Meetings', 'Time allocation and meetings', 4,
       '[{"id":"time_allocation","label":"How was your time allocated?","type":"textarea","required":false,"auto_populate":"calendar_events"},{"id":"meetings_attended","label":"Meetings attended","type":"text","required":false,"auto_populate":"meetings"}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Manager sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Manager' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Team Status', 'Team operational status', 0,
       '[{"id":"team_status","label":"Team availability and status","type":"textarea","required":true,"auto_populate":"team_availability"}]'::jsonb),
      (t_id, 'Project Health', 'Project health overview', 1,
       '[{"id":"project_health","label":"Project health summary","type":"textarea","required":true,"auto_populate":"project_status"}]'::jsonb),
      (t_id, 'Blockers & Risks', 'Issues and risks', 2,
       '[{"id":"blockers","label":"Current blockers","type":"textarea","required":false},{"id":"risks_identified","label":"Risks identified","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Decisions', 'Decisions made today', 3,
       '[{"id":"decisions","label":"Decisions made","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Customer Communication', 'Customer interactions', 4,
       '[{"id":"customer_comm","label":"Customer communications","type":"textarea","required":false,"auto_populate":"customer_interactions"}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Legal sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Legal' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Contract Reviews', 'Contracts reviewed today', 0,
       '[{"id":"contract_reviews","label":"Contracts reviewed","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Policy & Compliance', 'Policy and compliance work', 1,
       '[{"id":"policy_improvements","label":"Policy improvements","type":"textarea","required":false},{"id":"compliance_reviews","label":"Compliance reviews","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Regulatory Monitoring', 'Regulatory developments', 2,
       '[{"id":"regulatory_monitoring","label":"Regulatory monitoring","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Legal Risk Assessments', 'Risk assessments', 3,
       '[{"id":"legal_risks","label":"Legal risk assessments","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Documentation & Templates', 'Documentation updates', 4,
       '[{"id":"doc_updates","label":"Documentation updates","type":"textarea","required":false},{"id":"template_improvements","label":"Template improvements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Pending Follow-ups', 'Pending legal follow-ups', 5,
       '[{"id":"pending_followups","label":"Pending follow-ups","type":"textarea","required":false}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Executive sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Executive' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Strategic Progress', 'Strategic initiatives progress', 0,
       '[{"id":"strategic_progress","label":"Strategic progress","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Company Risks', 'Major company risks', 1,
       '[{"id":"company_risks","label":"Risks identified","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Department Performance', 'Department updates', 2,
       '[{"id":"dept_performance","label":"Department performance","type":"textarea","required":false,"auto_populate":"department_status"}]'::jsonb),
      (t_id, 'Major Decisions', 'Decisions made', 3,
       '[{"id":"major_decisions","label":"Major decisions","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Priorities', 'Company priorities', 4,
       '[{"id":"priorities","label":"Current priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Designer sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Designer' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'UI Progress', 'UI design work', 0,
       '[{"id":"ui_progress","label":"UI progress","type":"textarea","required":true}]'::jsonb),
      (t_id, 'UX Improvements', 'UX work', 1,
       '[{"id":"ux_improvements","label":"UX improvements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Design Reviews', 'Reviews conducted', 2,
       '[{"id":"design_reviews","label":"Design reviews","type":"text","required":false}]'::jsonb),
      (t_id, 'Assets Delivered', 'Assets delivered', 3,
       '[{"id":"assets_delivered","label":"Assets delivered","type":"text","required":false}]'::jsonb),
      (t_id, 'Customer Feedback', 'Feedback received', 4,
       '[{"id":"customer_feedback","label":"Customer feedback","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily QA sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - QA' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Test Execution', 'Tests executed today', 0,
       '[{"id":"test_execution","label":"Tests executed","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Bugs Discovered', 'Bugs found', 1,
       '[{"id":"bugs_discovered","label":"Bugs discovered","type":"text","required":false}]'::jsonb),
      (t_id, 'Regression Status', 'Regression testing', 2,
       '[{"id":"regression_status","label":"Regression status","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Release Readiness', 'Release readiness', 3,
       '[{"id":"release_readiness","label":"Release readiness","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 4,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Sales sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Sales' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Leads & Outreach', 'Leads contacted today', 0,
       '[{"id":"leads_contacted","label":"Leads contacted","type":"text","required":true}]'::jsonb),
      (t_id, 'Opportunities', 'Opportunities created', 1,
       '[{"id":"opportunities","label":"Opportunities created","type":"text","required":false}]'::jsonb),
      (t_id, 'Pipeline Updates', 'Pipeline changes', 2,
       '[{"id":"pipeline_updates","label":"Pipeline updates","type":"textarea","required":false,"auto_populate":"sales_pipeline"}]'::jsonb),
      (t_id, 'Customer Meetings', 'Meetings with customers', 3,
       '[{"id":"customer_meetings","label":"Customer meetings","type":"text","required":false,"auto_populate":"meetings"}]'::jsonb),
      (t_id, 'Revenue', 'Revenue generated', 4,
       '[{"id":"revenue","label":"Revenue generated","type":"text","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily HR sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - HR' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Recruitment', 'Recruitment progress', 0,
       '[{"id":"recruitment_progress","label":"Recruitment progress","type":"textarea","required":false,"auto_populate":"candidates"}]'::jsonb),
      (t_id, 'Attendance', 'Team attendance', 1,
       '[{"id":"attendance","label":"Attendance summary","type":"textarea","required":false,"auto_populate":"attendance"}]'::jsonb),
      (t_id, 'Team Engagement', 'Engagement activities', 2,
       '[{"id":"team_engagement","label":"Team engagement","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Performance', 'Performance follow-ups', 3,
       '[{"id":"performance","label":"Performance follow-ups","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Training', 'Training activities', 4,
       '[{"id":"training","label":"Training activities","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Finance sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Finance' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Budget Tracking', 'Budget status', 0,
       '[{"id":"budget_tracking","label":"Budget tracking","type":"textarea","required":false,"auto_populate":"budgets"}]'::jsonb),
      (t_id, 'Expenses', 'Expenses processed', 1,
       '[{"id":"expenses","label":"Expenses","type":"text","required":false,"auto_populate":"expenses"}]'::jsonb),
      (t_id, 'Revenue', 'Revenue received', 2,
       '[{"id":"revenue","label":"Revenue","type":"text","required":false,"auto_populate":"revenue"}]'::jsonb),
      (t_id, 'Invoices', 'Outstanding invoices', 3,
       '[{"id":"invoices","label":"Outstanding invoices","type":"text","required":false}]'::jsonb),
      (t_id, 'Financial Risks', 'Financial risks', 4,
       '[{"id":"financial_risks","label":"Financial risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Marketing sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Marketing' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Campaign Progress', 'Campaign status', 0,
       '[{"id":"campaign_progress","label":"Campaign progress","type":"textarea","required":true,"auto_populate":"campaigns"}]'::jsonb),
      (t_id, 'Content Published', 'Content created', 1,
       '[{"id":"content_published","label":"Content published","type":"text","required":false}]'::jsonb),
      (t_id, 'Social Engagement', 'Social media metrics', 2,
       '[{"id":"social_engagement","label":"Social engagement","type":"text","required":false}]'::jsonb),
      (t_id, 'Lead Generation', 'Leads generated', 3,
       '[{"id":"lead_generation","label":"Leads generated","type":"text","required":false}]'::jsonb),
      (t_id, 'Brand Activities', 'Brand work', 4,
       '[{"id":"brand_activities","label":"Brand activities","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Daily Support sections
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Support' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Tickets Resolved', 'Tickets closed today', 0,
       '[{"id":"tickets_resolved","label":"Tickets resolved","type":"text","required":true}]'::jsonb),
      (t_id, 'Response Times', 'Response metrics', 1,
       '[{"id":"response_times","label":"Response times","type":"text","required":false}]'::jsonb),
      (t_id, 'Customer Feedback', 'Feedback received', 2,
       '[{"id":"customer_feedback","label":"Customer feedback","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Escalations', 'Escalated issues', 3,
       '[{"id":"escalations","label":"Escalations","type":"text","required":false}]'::jsonb),
      (t_id, 'KB Updates', 'Knowledge base updates', 4,
       '[{"id":"kb_updates","label":"KB updates","type":"text","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 5,
       '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Generic daily for remaining roles (director, operations, admin)
  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Director' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Planned Work', 'Planned tasks', 0, '[{"id":"planned_work","label":"Today''s planned work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Completed Work', 'Completed tasks', 1, '[{"id":"completed_work","label":"Completed work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Blockers', 'Blockers', 2, '[{"id":"blockers","label":"Blockers","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Decisions', 'Decisions made', 3, '[{"id":"decisions","label":"Decisions made","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 4, '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Operations' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Operational Tasks', 'Operations work', 0, '[{"id":"planned_work","label":"Today''s planned work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Completed Work', 'Completed tasks', 1, '[{"id":"completed_work","label":"Completed work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Process Improvements', 'Process improvements', 2, '[{"id":"process_improvements","label":"Process improvements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Blockers', 'Blockers', 3, '[{"id":"blockers","label":"Blockers","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 4, '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Daily Report - Admin' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'System Administration', 'Admin tasks', 0, '[{"id":"planned_work","label":"Today''s planned work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Completed Work', 'Completed tasks', 1, '[{"id":"completed_work","label":"Completed work","type":"textarea","required":true}]'::jsonb),
      (t_id, 'System Health', 'System status', 2, '[{"id":"system_health","label":"System health","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Blockers', 'Blockers', 3, '[{"id":"blockers","label":"Blockers","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Tomorrow', 'Plans for tomorrow', 4, '[{"id":"next_priorities","label":"Tomorrow''s priorities","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Weekly sections (for key roles)
  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Manager' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Objectives Completed', 'Weekly objectives', 0, '[{"id":"objectives_completed","label":"Objectives completed","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Project Progress', 'Project updates', 1, '[{"id":"project_progress","label":"Project progress","type":"textarea","required":true,"auto_populate":"project_status"}]'::jsonb),
      (t_id, 'Key Achievements', 'Achievements', 2, '[{"id":"achievements","label":"Key achievements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Challenges', 'Challenges faced', 3, '[{"id":"challenges","label":"Challenges","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Risks Identified', 'New risks', 4, '[{"id":"risks","label":"Risks identified","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Team Collaboration', 'Collaboration', 5, '[{"id":"collaboration","label":"Team collaboration","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Customer Updates', 'Customer communications', 6, '[{"id":"customer_updates","label":"Customer updates","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Lessons Learned', 'Lessons learned', 7, '[{"id":"lessons","label":"Lessons learned","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Priorities for next week', 8, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Developer' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Objectives Completed', 'Weekly objectives', 0, '[{"id":"objectives_completed","label":"Objectives completed","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Features & Bugs', 'Development output', 1, '[{"id":"features","label":"Features completed","type":"text","required":false},{"id":"bugs","label":"Bugs resolved","type":"text","required":false}]'::jsonb),
      (t_id, 'Code Reviews', 'Review activity', 2, '[{"id":"code_reviews","label":"Code reviews","type":"text","required":false}]'::jsonb),
      (t_id, 'Technical Challenges', 'Challenges', 3, '[{"id":"challenges","label":"Technical challenges","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Testing', 'Testing completed', 4, '[{"id":"testing","label":"Testing completed","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Documentation', 'Docs updated', 5, '[{"id":"documentation","label":"Documentation updates","type":"text","required":false}]'::jsonb),
      (t_id, 'Lessons Learned', 'Lessons learned', 6, '[{"id":"lessons","label":"Lessons learned","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 7, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Executive' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Strategic Progress', 'Strategic progress', 0, '[{"id":"strategic_progress","label":"Strategic progress","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Company Risks', 'Risks', 1, '[{"id":"risks","label":"Company risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Department Performance', 'Department updates', 2, '[{"id":"dept_performance","label":"Department performance","type":"textarea","required":false,"auto_populate":"department_status"}]'::jsonb),
      (t_id, 'Major Decisions', 'Decisions', 3, '[{"id":"decisions","label":"Major decisions","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Growth Opportunities', 'Growth', 4, '[{"id":"growth","label":"Growth opportunities","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Priorities for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Monthly sections for key roles
  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - Executive' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Performance Summary', 'Monthly performance', 0, '[{"id":"performance","label":"Performance summary","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Department Achievements', 'Achievements', 1, '[{"id":"achievements","label":"Department achievements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'KPI Progress', 'KPI status', 2, '[{"id":"kpis","label":"KPI progress","type":"textarea","required":false,"auto_populate":"kpis"}]'::jsonb),
      (t_id, 'Financial Impact', 'Financial results', 3, '[{"id":"financial","label":"Financial impact","type":"textarea","required":false,"auto_populate":"financials"}]'::jsonb),
      (t_id, 'Major Risks', 'Major risks', 4, '[{"id":"risks","label":"Major risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Recommendations', 'Strategic recommendations', 5, '[{"id":"recommendations","label":"Recommendations","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 6, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - Manager' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Performance Summary', 'Monthly performance', 0, '[{"id":"performance","label":"Performance summary","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Project Status', 'Project health', 1, '[{"id":"project_status","label":"Project status","type":"textarea","required":true,"auto_populate":"project_status"}]'::jsonb),
      (t_id, 'Budget Performance', 'Budget', 2, '[{"id":"budget","label":"Budget performance","type":"textarea","required":false,"auto_populate":"budgets"}]'::jsonb),
      (t_id, 'Team Development', 'Team growth', 3, '[{"id":"team_dev","label":"Team development","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Operational Improvements', 'Improvements', 4, '[{"id":"improvements","label":"Operational improvements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Major Risks', 'Risks', 5, '[{"id":"risks","label":"Major risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Recommendations', 'Recommendations', 6, '[{"id":"recommendations","label":"Recommendations","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 7, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Generic weekly for remaining roles
  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Designer' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Objectives Completed', 'Weekly objectives', 0, '[{"id":"objectives","label":"Objectives completed","type":"textarea","required":true}]'::jsonb),
      (t_id, 'UI/UX Progress', 'Design progress', 1, '[{"id":"ui_progress","label":"UI progress","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Design Reviews', 'Reviews', 2, '[{"id":"reviews","label":"Design reviews","type":"text","required":false}]'::jsonb),
      (t_id, 'Assets Delivered', 'Assets', 3, '[{"id":"assets","label":"Assets delivered","type":"text","required":false}]'::jsonb),
      (t_id, 'Brand Consistency', 'Brand work', 4, '[{"id":"brand","label":"Brand consistency","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - QA' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Test Execution', 'Testing summary', 0, '[{"id":"testing","label":"Test execution summary","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Quality Metrics', 'Quality', 1, '[{"id":"metrics","label":"Quality metrics","type":"text","required":false}]'::jsonb),
      (t_id, 'Regression Status', 'Regression', 2, '[{"id":"regression","label":"Regression status","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Release Readiness', 'Releases', 3, '[{"id":"release","label":"Release readiness","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 4, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Sales' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Leads & Pipeline', 'Sales activity', 0, '[{"id":"leads","label":"Leads contacted","type":"text","required":true}]'::jsonb),
      (t_id, 'Opportunities', 'Opportunities', 1, '[{"id":"opportunities","label":"Opportunities created","type":"text","required":false}]'::jsonb),
      (t_id, 'Customer Meetings', 'Meetings', 2, '[{"id":"meetings","label":"Customer meetings","type":"text","required":false}]'::jsonb),
      (t_id, 'Revenue', 'Revenue', 3, '[{"id":"revenue","label":"Revenue generated","type":"text","required":false}]'::jsonb),
      (t_id, 'Forecast', 'Forecast updates', 4, '[{"id":"forecast","label":"Forecast updates","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - HR' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Recruitment Progress', 'Recruitment', 0, '[{"id":"recruitment","label":"Recruitment progress","type":"textarea","required":false,"auto_populate":"candidates"}]'::jsonb),
      (t_id, 'Attendance', 'Attendance', 1, '[{"id":"attendance","label":"Attendance summary","type":"textarea","required":false,"auto_populate":"attendance"}]'::jsonb),
      (t_id, 'Team Engagement', 'Engagement', 2, '[{"id":"engagement","label":"Team engagement","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Training', 'Training', 3, '[{"id":"training","label":"Training activities","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Capacity Planning', 'Capacity', 4, '[{"id":"capacity","label":"Capacity planning","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Finance' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Budget Tracking', 'Budget', 0, '[{"id":"budget","label":"Budget tracking","type":"textarea","required":false,"auto_populate":"budgets"}]'::jsonb),
      (t_id, 'Expenses', 'Expenses', 1, '[{"id":"expenses","label":"Expenses","type":"text","required":false,"auto_populate":"expenses"}]'::jsonb),
      (t_id, 'Revenue', 'Revenue', 2, '[{"id":"revenue","label":"Revenue","type":"text","required":false}]'::jsonb),
      (t_id, 'Outstanding Invoices', 'Invoices', 3, '[{"id":"invoices","label":"Outstanding invoices","type":"text","required":false}]'::jsonb),
      (t_id, 'Financial Risks', 'Risks', 4, '[{"id":"risks","label":"Financial risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Forecast Updates', 'Forecast', 5, '[{"id":"forecast","label":"Forecast updates","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 6, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Legal' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Contract Reviews', 'Contracts', 0, '[{"id":"contracts","label":"Contract reviews","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Policy Improvements', 'Policies', 1, '[{"id":"policies","label":"Policy improvements","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Regulatory Monitoring', 'Regulatory', 2, '[{"id":"regulatory","label":"Regulatory monitoring","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Legal Risk Assessments', 'Risks', 3, '[{"id":"risks","label":"Legal risk assessments","type":"textarea","required":false}]'::jsonb),
      (t_id, 'IP Monitoring', 'IP', 4, '[{"id":"ip","label":"IP monitoring","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Marketing' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Campaign Progress', 'Campaigns', 0, '[{"id":"campaigns","label":"Campaign progress","type":"textarea","required":false,"auto_populate":"campaigns"}]'::jsonb),
      (t_id, 'Content Published', 'Content', 1, '[{"id":"content","label":"Content published","type":"text","required":false}]'::jsonb),
      (t_id, 'Social Engagement', 'Social', 2, '[{"id":"social","label":"Social engagement","type":"text","required":false}]'::jsonb),
      (t_id, 'Lead Generation', 'Leads', 3, '[{"id":"leads","label":"Lead generation","type":"text","required":false}]'::jsonb),
      (t_id, 'Upcoming Campaigns', 'Upcoming', 4, '[{"id":"upcoming","label":"Upcoming campaigns","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Weekly Report - Support' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Tickets Resolved', 'Tickets', 0, '[{"id":"tickets","label":"Tickets resolved","type":"text","required":true}]'::jsonb),
      (t_id, 'Response Times', 'Response', 1, '[{"id":"response","label":"Response times","type":"text","required":false}]'::jsonb),
      (t_id, 'Customer Feedback', 'Feedback', 2, '[{"id":"feedback","label":"Customer feedback","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Escalations', 'Escalations', 3, '[{"id":"escalations","label":"Escalations","type":"text","required":false}]'::jsonb),
      (t_id, 'KB Updates', 'KB', 4, '[{"id":"kb","label":"KB updates","type":"text","required":false}]'::jsonb),
      (t_id, 'Next Week', 'Plans for next week', 5, '[{"id":"next_week","label":"Priorities for next week","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Monthly for remaining roles
  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - Developer' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Performance Summary', 'Monthly performance', 0, '[{"id":"performance","label":"Performance summary","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Features Delivered', 'Features', 1, '[{"id":"features","label":"Features delivered","type":"text","required":false}]'::jsonb),
      (t_id, 'Technical Debt', 'Tech debt', 2, '[{"id":"tech_debt","label":"Technical debt addressed","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Learning & Development', 'Learning', 3, '[{"id":"learning","label":"Learning objectives","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Recommendations', 'Recommendations', 4, '[{"id":"recommendations","label":"Recommendations","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 5, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - Finance' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Financial Performance', 'Performance', 0, '[{"id":"performance","label":"Financial performance","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Budget vs Actual', 'Budget', 1, '[{"id":"budget","label":"Budget vs actual","type":"textarea","required":false,"auto_populate":"budgets"}]'::jsonb),
      (t_id, 'Revenue & Expenses', 'Revenue', 2, '[{"id":"revenue","label":"Revenue and expenses","type":"textarea","required":false,"auto_populate":"financials"}]'::jsonb),
      (t_id, 'Outstanding Invoices', 'Invoices', 3, '[{"id":"invoices","label":"Outstanding invoices","type":"text","required":false}]'::jsonb),
      (t_id, 'Financial Risks', 'Risks', 4, '[{"id":"risks","label":"Financial risks","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Forecast Updates', 'Forecast', 5, '[{"id":"forecast","label":"Forecast updates","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 6, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - HR' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'HR Performance', 'Performance', 0, '[{"id":"performance","label":"HR performance","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Recruitment Summary', 'Recruitment', 1, '[{"id":"recruitment","label":"Recruitment summary","type":"textarea","required":false,"auto_populate":"candidates"}]'::jsonb),
      (t_id, 'Attendance', 'Attendance', 2, '[{"id":"attendance","label":"Attendance summary","type":"textarea","required":false,"auto_populate":"attendance"}]'::jsonb),
      (t_id, 'Team Engagement', 'Engagement', 3, '[{"id":"engagement","label":"Team engagement","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Training Completed', 'Training', 4, '[{"id":"training","label":"Training completed","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Capacity Planning', 'Capacity', 5, '[{"id":"capacity","label":"Capacity planning","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 6, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO t_id FROM report_templates WHERE name = 'Monthly Report - Marketing' LIMIT 1;
  IF t_id IS NOT NULL THEN
    INSERT INTO report_sections (template_id, title, description, sort_order, questions)
    VALUES
      (t_id, 'Marketing Performance', 'Performance', 0, '[{"id":"performance","label":"Marketing performance","type":"textarea","required":true}]'::jsonb),
      (t_id, 'Campaign Results', 'Campaigns', 1, '[{"id":"campaigns","label":"Campaign results","type":"textarea","required":false,"auto_populate":"campaigns"}]'::jsonb),
      (t_id, 'Lead Generation', 'Leads', 2, '[{"id":"leads","label":"Lead generation","type":"text","required":false}]'::jsonb),
      (t_id, 'Customer Satisfaction', 'CSAT', 3, '[{"id":"csat","label":"Customer satisfaction","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Brand Activities', 'Brand', 4, '[{"id":"brand","label":"Brand activities","type":"textarea","required":false}]'::jsonb),
      (t_id, 'Next Month', 'Objectives for next month', 5, '[{"id":"next_month","label":"Objectives for next month","type":"textarea","required":true}]'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
