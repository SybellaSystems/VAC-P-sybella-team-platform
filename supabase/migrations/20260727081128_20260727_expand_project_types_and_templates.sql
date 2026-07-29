/*
# Expand Project Types to 30 + Project Templates

## Overview
This migration expands the project_type constraint from 10 values to 30 values covering
all departments and industries. It also creates a project_templates table so admins can
create, edit, archive, and customize project templates without software updates.

## Modified Tables
- `projects` - Removes the old CHECK constraint on project_type and replaces it with
  a new one that accepts 30 project type values.

## New Tables
1. `project_templates` - Admin-managed templates that define the structure, required
   fields, default milestones, phases, and configuration for each project type.
   - id, name, description, project_type, category, structure (jsonb), is_active,
     is_archived, created_by, created_at, updated_at

## Security
- RLS enabled on project_templates
- All authenticated users can read templates (needed during project creation)
- Only admin/director can create/update/delete templates
*/

-- ============================================================
-- 1. Expand project_type constraint on projects
-- ============================================================
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_project_type_check'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_project_type_check;
  END IF;
END $$;

ALTER TABLE projects
  ADD CONSTRAINT projects_project_type_check CHECK (
    project_type IN (
      'internal','customer','partnership','maintenance','research',
      'software_dev','website_dev','mobile_app','desktop_app','ai_ml',
      'cybersecurity','infrastructure','cloud_migration','marketing_campaign',
      'branding_design','sales_initiative','customer_support_impl','hr_project',
      'recruitment','legal_compliance','finance_accounting','procurement',
      'internal_ops','rd','training_program','business_consulting',
      'event_management','government','community_initiative',
      'product_dev','other'
    )
  );

-- ============================================================
-- 2. Project Templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  project_type text NOT NULL,
  category text DEFAULT 'general',
  structure jsonb DEFAULT '{}'::jsonb,
  default_milestones jsonb DEFAULT '[]'::jsonb,
  default_phases jsonb DEFAULT '[]'::jsonb,
  required_fields text[] DEFAULT '{}'::text[],
  is_active boolean DEFAULT true,
  is_archived boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates viewable by authenticated" ON project_templates;
CREATE POLICY "Templates viewable by authenticated" ON project_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Templates insertable by admins" ON project_templates;
CREATE POLICY "Templates insertable by admins" ON project_templates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

DROP POLICY IF EXISTS "Templates updatable by admins" ON project_templates;
CREATE POLICY "Templates updatable by admins" ON project_templates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

DROP POLICY IF EXISTS "Templates deletable by admins" ON project_templates;
CREATE POLICY "Templates deletable by admins" ON project_templates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

CREATE INDEX IF NOT EXISTS idx_templates_type ON project_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON project_templates(is_active) WHERE is_active = true;

-- ============================================================
-- 3. Seed default templates for each project type
-- ============================================================
INSERT INTO project_templates (name, description, project_type, category, structure, default_milestones, required_fields)
VALUES
  ('Software Development', 'Full lifecycle software development project with agile phases', 'software_dev', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Design","status":"planned"},{"name":"Development","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Deployment","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Website Development', 'Website creation project from design to deployment', 'website_dev', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Design","status":"planned"},{"name":"Development","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Launch","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Mobile Application', 'Mobile app development for iOS/Android', 'mobile_app', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"UI/UX","status":"planned"},{"name":"Development","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Release","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Desktop Application', 'Desktop software development', 'desktop_app', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Design","status":"planned"},{"name":"Development","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Deployment","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('AI & Machine Learning', 'AI/ML model development and deployment', 'ai_ml', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Data Collection","status":"planned"},{"name":"Model Design","status":"planned"},{"name":"Training","status":"planned"},{"name":"Evaluation","status":"planned"},{"name":"Deployment","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Cybersecurity', 'Security audit, penetration testing, or security implementation', 'cybersecurity', 'security',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Assessment","status":"planned"},{"name":"Planning","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Validation","status":"planned"},{"name":"Report","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Infrastructure & Networking', 'Network infrastructure setup or upgrade', 'infrastructure', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Survey","status":"planned"},{"name":"Design","status":"planned"},{"name":"Installation","status":"planned"},{"name":"Configuration","status":"planned"},{"name":"Handover","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Cloud Migration', 'Migrate systems to cloud infrastructure', 'cloud_migration', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Assessment","status":"planned"},{"name":"Planning","status":"planned"},{"name":"Migration","status":"planned"},{"name":"Optimization","status":"planned"},{"name":"Go-Live","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Marketing Campaign', 'Marketing campaign planning and execution', 'marketing_campaign', 'marketing',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Strategy","status":"planned"},{"name":"Content Creation","status":"planned"},{"name":"Launch","status":"planned"},{"name":"Monitoring","status":"planned"},{"name":"Report","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Branding & Design', 'Brand identity and design project', 'branding_design', 'marketing',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Discovery","status":"planned"},{"name":"Concepts","status":"planned"},{"name":"Design","status":"planned"},{"name":"Review","status":"planned"},{"name":"Delivery","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Sales Initiative', 'Sales campaign or initiative', 'sales_initiative', 'sales',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Outreach","status":"planned"},{"name":"Negotiation","status":"planned"},{"name":"Close","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Customer Support Implementation', 'Set up customer support processes', 'customer_support_impl', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Assessment","status":"planned"},{"name":"Design","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Training","status":"planned"},{"name":"Go-Live","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Human Resources Project', 'HR initiative or program', 'hr_project', 'hr',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Rollout","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Recruitment', 'Recruitment campaign or hiring drive', 'recruitment', 'hr',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Sourcing","status":"planned"},{"name":"Interviews","status":"planned"},{"name":"Offers","status":"planned"},{"name":"Onboarding","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Legal & Compliance', 'Legal project or compliance initiative', 'legal_compliance', 'legal',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Review","status":"planned"},{"name":"Drafting","status":"planned"},{"name":"Filing","status":"planned"},{"name":"Approval","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Finance & Accounting', 'Financial project or accounting initiative', 'finance_accounting', 'finance',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Analysis","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Audit","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Procurement', 'Procurement project or vendor selection', 'procurement', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Requirements","status":"planned"},{"name":"RFP","status":"planned"},{"name":"Evaluation","status":"planned"},{"name":"Contract","status":"planned"},{"name":"Delivery","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Internal Operations', 'Internal operations improvement', 'internal_ops', 'operations',
   '{"steps":["information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Assessment","status":"planned"},{"name":"Planning","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date']),
  ('Research & Development', 'R&D project or experiment', 'rd', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Research","status":"planned"},{"name":"Prototype","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Evaluation","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Training Program', 'Training or learning program', 'training_program', 'hr',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Design","status":"planned"},{"name":"Content","status":"planned"},{"name":"Delivery","status":"planned"},{"name":"Assessment","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Business Consulting', 'Consulting engagement', 'business_consulting', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Discovery","status":"planned"},{"name":"Analysis","status":"planned"},{"name":"Recommendations","status":"planned"},{"name":"Presentation","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Event Management', 'Event planning and execution', 'event_management', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Preparation","status":"planned"},{"name":"Execution","status":"planned"},{"name":"Post-Event","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Construction', 'Construction project', 'construction', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Design","status":"planned"},{"name":"Permits","status":"planned"},{"name":"Construction","status":"planned"},{"name":"Inspection","status":"planned"},{"name":"Handover","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Government Project', 'Government contract or initiative', 'government', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Proposal","status":"planned"},{"name":"Approval","status":"planned"},{"name":"Implementation","status":"planned"},{"name":"Audit","status":"planned"},{"name":"Handover","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Partnership Program', 'Partnership establishment project', 'partnership', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Negotiation","status":"planned"},{"name":"Agreement","status":"planned"},{"name":"Onboarding","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Community Initiative', 'Community or CSR project', 'community_initiative', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Mobilization","status":"planned"},{"name":"Execution","status":"planned"},{"name":"Report","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Product Development', 'New product development', 'product_dev', 'development',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Ideation","status":"planned"},{"name":"Design","status":"planned"},{"name":"Prototype","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Launch","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Maintenance Contract', 'Ongoing maintenance engagement', 'maintenance', 'operations',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Assessment","status":"planned"},{"name":"Setup","status":"planned"},{"name":"Ongoing","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Internal Project', 'Internal company project', 'internal', 'general',
   '{"steps":["information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Execution","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date']),
  ('Customer Project', 'External customer engagement', 'customer', 'general',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Design","status":"planned"},{"name":"Development","status":"planned"},{"name":"Testing","status":"planned"},{"name":"Deployment","status":"planned"},{"name":"Support","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date','team']),
  ('Other (Custom)', 'Custom project type', 'other', 'general',
   '{"steps":["owner","information","financial","documentation","requirements","team","timeline","wbs","risks","communication"]}'::jsonb,
   '[{"name":"Planning","status":"planned"},{"name":"Execution","status":"planned"},{"name":"Review","status":"planned"}]'::jsonb,
   ARRAY['name','description','start_date','end_date'])
ON CONFLICT DO NOTHING;
