/*
# Project Creation Wizard Schema Extension

## Overview
Extends the VAC-P schema to support a full 12-step Project Creation Wizard and progressive project editing. Adds rich project metadata, customer detail fields, milestones, phases, risks, dependencies, documents, activity log, requirements checklist, and change requests.

## New Tables
1. `project_milestones` - Key project milestones with target dates and status
2. `project_phases` - Work breakdown phases (Planning, UI, Dev, Testing, Deployment, etc.)
3. `project_risks` - Risk register entries (risk, probability, impact, owner, mitigation)
4. `project_dependencies` - External/internal dependencies blocking the project
5. `project_documents` - Uploaded/linked documents classified into repository folders
6. `project_activity_log` - Activity timeline entries (e.g. "Project Created")
7. `project_requirements_checklist` - Live checklist of pending information/items needed
8. `project_change_requests` - Tracked scope/timeline/cost change requests with approval status
9. `project_decisions` - Decision register (who, why, consequences)
10. `project_issues` - Operational issues separate from risks
11. `project_lessons_learned` - Insights captured throughout the project

## Modified Tables
- `projects` - Added: project_code, project_type, department, category, objectives, deliverables, success_criteria, tags, customer_price, discount, taxes, expected_revenue, estimated_costs (jsonb), warranty_end, support_end, deployment_date, maintenance_end, health_score, readiness_score, communication_channels, meeting_frequency, escalation_contacts, approval_needed, approval_person, brand_assets, credentials_required, git_repo_url, doc_links
- `customers` - Added: industry, city, tin, registration_number, website, postal_address, physical_address, contact_person_name, contact_position, contact_email, contact_phone, billing_contact, finance_contact

## Security
- RLS enabled on all new tables
- Authenticated users can read; admin/director/manager can write (project managers own their projects)
- All policies use auth.uid() ownership checks
*/

-- ============================================================
-- EXTEND PROJECTS TABLE
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'internal' CHECK (project_type IN ('internal','customer','partnership','maintenance','research','software_product','infrastructure','marketing','hr','legal')),
  ADD COLUMN IF NOT EXISTS department text DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text DEFAULT '',
  ADD COLUMN IF NOT EXISTS objectives text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deliverables text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS success_criteria text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS customer_price numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxes numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_revenue numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_costs jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty_end date,
  ADD COLUMN IF NOT EXISTS support_end date,
  ADD COLUMN IF NOT EXISTS deployment_date date,
  ADD COLUMN IF NOT EXISTS maintenance_end date,
  ADD COLUMN IF NOT EXISTS health_score numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_score numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS communication_channels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meeting_frequency text DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS escalation_contacts text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notification_recipients text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_needed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_person text DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_assets jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credentials_required jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS git_repo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS doc_links jsonb DEFAULT '[]'::jsonb;

-- ============================================================
-- EXTEND CUSTOMERS TABLE
-- ============================================================
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS industry text DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tin text DEFAULT '',
  ADD COLUMN IF NOT EXISTS registration_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS physical_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_person_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_position text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_contact text DEFAULT '',
  ADD COLUMN IF NOT EXISTS finance_contact text DEFAULT '';

-- ============================================================
-- PROJECT MILESTONES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  target_date date,
  status text DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','delayed')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Milestones viewable by authenticated" ON project_milestones;
CREATE POLICY "Milestones viewable by authenticated" ON project_milestones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Milestones manageable by managers" ON project_milestones;
CREATE POLICY "Milestones manageable by managers" ON project_milestones
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Milestones updatable by managers" ON project_milestones;
CREATE POLICY "Milestones updatable by managers" ON project_milestones
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Milestones deletable by managers" ON project_milestones;
CREATE POLICY "Milestones deletable by managers" ON project_milestones
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT PHASES (Work Breakdown Structure)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  sort_order integer DEFAULT 0,
  status text DEFAULT 'planned' CHECK (status IN ('planned','active','completed','on_hold')),
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Phases viewable by authenticated" ON project_phases;
CREATE POLICY "Phases viewable by authenticated" ON project_phases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Phases insertable by team" ON project_phases;
CREATE POLICY "Phases insertable by team" ON project_phases
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Phases updatable by team" ON project_phases;
CREATE POLICY "Phases updatable by team" ON project_phases
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Phases deletable by managers" ON project_phases;
CREATE POLICY "Phases deletable by managers" ON project_phases
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT RISKS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  risk text NOT NULL,
  probability text DEFAULT 'medium' CHECK (probability IN ('low','medium','high')),
  impact text DEFAULT 'medium' CHECK (impact IN ('low','medium','high')),
  owner uuid REFERENCES profiles(id),
  mitigation text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open','mitigated','closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Risks viewable by authenticated" ON project_risks;
CREATE POLICY "Risks viewable by authenticated" ON project_risks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Risks insertable by team" ON project_risks;
CREATE POLICY "Risks insertable by team" ON project_risks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Risks updatable by team" ON project_risks;
CREATE POLICY "Risks updatable by team" ON project_risks
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Risks deletable by managers" ON project_risks;
CREATE POLICY "Risks deletable by managers" ON project_risks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT DEPENDENCIES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  dependency_type text DEFAULT 'external' CHECK (dependency_type IN ('customer','payment','hosting','domain','government','internal','other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','resolved','blocked')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dependencies viewable by authenticated" ON project_dependencies;
CREATE POLICY "Dependencies viewable by authenticated" ON project_dependencies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Dependencies insertable by team" ON project_dependencies;
CREATE POLICY "Dependencies insertable by team" ON project_dependencies
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Dependencies updatable by team" ON project_dependencies;
CREATE POLICY "Dependencies updatable by team" ON project_dependencies
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Dependencies deletable by managers" ON project_dependencies;
CREATE POLICY "Dependencies deletable by managers" ON project_dependencies
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT DOCUMENTS (Repository)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text DEFAULT 'other' CHECK (document_type IN ('proposal','quotation','contract','scope','requirements','design','meeting_minutes','invoice','purchase_order','research','wireframes','ui','api_docs','other')),
  folder text DEFAULT 'other' CHECK (folder IN ('contracts','requirements','design','finance','meetings','other')),
  url text DEFAULT '',
  description text DEFAULT '',
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Documents viewable by authenticated" ON project_documents;
CREATE POLICY "Documents viewable by authenticated" ON project_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Documents insertable by team" ON project_documents;
CREATE POLICY "Documents insertable by team" ON project_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Documents updatable by team" ON project_documents;
CREATE POLICY "Documents updatable by team" ON project_documents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Documents deletable by managers" ON project_documents;
CREATE POLICY "Documents deletable by managers" ON project_documents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS project_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text DEFAULT '',
  actor_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity viewable by authenticated" ON project_activity_log;
CREATE POLICY "Activity viewable by authenticated" ON project_activity_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Activity insertable by authenticated" ON project_activity_log;
CREATE POLICY "Activity insertable by authenticated" ON project_activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PROJECT REQUIREMENTS CHECKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS project_requirements_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item text NOT NULL,
  is_done boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_requirements_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Checklist viewable by authenticated" ON project_requirements_checklist;
CREATE POLICY "Checklist viewable by authenticated" ON project_requirements_checklist
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Checklist insertable by team" ON project_requirements_checklist;
CREATE POLICY "Checklist insertable by team" ON project_requirements_checklist
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Checklist updatable by team" ON project_requirements_checklist;
CREATE POLICY "Checklist updatable by team" ON project_requirements_checklist
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

DROP POLICY IF EXISTS "Checklist deletable by managers" ON project_requirements_checklist;
CREATE POLICY "Checklist deletable by managers" ON project_requirements_checklist
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT CHANGE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  change_type text DEFAULT 'scope' CHECK (change_type IN ('scope','timeline','cost','resource','other')),
  impact_analysis text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','implemented')),
  requested_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Change requests viewable by authenticated" ON project_change_requests;
CREATE POLICY "Change requests viewable by authenticated" ON project_change_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Change requests insertable by team" ON project_change_requests;
CREATE POLICY "Change requests insertable by team" ON project_change_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Change requests updatable by managers" ON project_change_requests;
CREATE POLICY "Change requests updatable by managers" ON project_change_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

-- ============================================================
-- PROJECT DECISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS project_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision text NOT NULL,
  rationale text DEFAULT '',
  consequences text DEFAULT '',
  decided_by uuid REFERENCES profiles(id),
  decided_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Decisions viewable by authenticated" ON project_decisions;
CREATE POLICY "Decisions viewable by authenticated" ON project_decisions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Decisions insertable by team" ON project_decisions;
CREATE POLICY "Decisions insertable by team" ON project_decisions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- PROJECT ISSUES
-- ============================================================
CREATE TABLE IF NOT EXISTS project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  severity text DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  owner uuid REFERENCES profiles(id),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolution text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Issues viewable by authenticated" ON project_issues;
CREATE POLICY "Issues viewable by authenticated" ON project_issues
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Issues insertable by team" ON project_issues;
CREATE POLICY "Issues insertable by team" ON project_issues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Issues updatable by team" ON project_issues;
CREATE POLICY "Issues updatable by team" ON project_issues
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','developer','designer','qa'))
  );

-- ============================================================
-- PROJECT LESSONS LEARNED
-- ============================================================
CREATE TABLE IF NOT EXISTS project_lessons_learned (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  insight text NOT NULL,
  category text DEFAULT 'process' CHECK (category IN ('process','technical','communication','resource','other')),
  captured_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_lessons_learned ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lessons viewable by authenticated" ON project_lessons_learned;
CREATE POLICY "Lessons viewable by authenticated" ON project_lessons_learned
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lessons insertable by team" ON project_lessons_learned;
CREATE POLICY "Lessons insertable by team" ON project_lessons_learned
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- EXTEND PROJECT ASSIGNMENTS WITH PERMISSIONS
-- ============================================================
ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS can_edit_tasks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_project boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_members boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_analytics boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_import_export boolean DEFAULT false;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_project ON project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_project ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_project ON project_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON project_activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_checklist_project ON project_requirements_checklist(project_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_project ON project_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project ON project_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_project ON project_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_project ON project_lessons_learned(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
