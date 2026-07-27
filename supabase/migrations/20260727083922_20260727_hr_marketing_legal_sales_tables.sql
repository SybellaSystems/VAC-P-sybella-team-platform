/*
# HR, Marketing, Legal, and Sales Pipeline Tables

## Overview
Creates tables for the placeholder pages (HR, Marketing, Legal, Sales Pipeline, My Work, Project Office)
so they can connect to real database data. Also adds relationship columns to connect existing tables.

## New Tables
1. `hr_candidates` - Recruitment candidates with stage tracking
2. `hr_performance_reviews` - Employee performance review cycles
3. `hr_onboarding_tasks` - Onboarding checklist items for new hires
4. `marketing_campaigns` - Marketing campaign tracking with metrics
5. `legal_documents` - Legal document register with status tracking
6. `legal_matters` - Legal matters/cases with priority and status
7. `sales_opportunities` - Sales pipeline opportunities with stage tracking
8. `sales_activities` - Sales activities (calls, emails, meetings) logged per opportunity

## Security
- RLS enabled on all tables
- Authenticated users can read; role-specific write access
*/

-- ============================================================
-- 1. HR Candidates
-- ============================================================
CREATE TABLE IF NOT EXISTS hr_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  position text DEFAULT '',
  department text DEFAULT '',
  stage text DEFAULT 'applied' CHECK (stage IN ('applied','screening','interview','offer','hired','rejected')),
  source text DEFAULT '',
  resume_url text DEFAULT '',
  notes text DEFAULT '',
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expected_salary numeric(14,2),
  available_from date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR candidates viewable by authenticated" ON hr_candidates;
CREATE POLICY "HR candidates viewable by authenticated" ON hr_candidates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "HR candidates insertable by hr" ON hr_candidates;
CREATE POLICY "HR candidates insertable by hr" ON hr_candidates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "HR candidates updatable by hr" ON hr_candidates;
CREATE POLICY "HR candidates updatable by hr" ON hr_candidates
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "HR candidates deletable by hr" ON hr_candidates;
CREATE POLICY "HR candidates deletable by hr" ON hr_candidates
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_hr_candidates_stage ON hr_candidates(stage);

-- ============================================================
-- 2. HR Performance Reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_cycle text DEFAULT 'quarterly' CHECK (review_cycle IN ('quarterly','annual','mid_year','probation')),
  period text DEFAULT '',
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  strengths text DEFAULT '',
  areas_for_improvement text DEFAULT '',
  goals text DEFAULT '',
  comments text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Performance reviews viewable by managers" ON hr_performance_reviews;
CREATE POLICY "Performance reviews viewable by managers" ON hr_performance_reviews
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Performance reviews insertable by managers" ON hr_performance_reviews;
CREATE POLICY "Performance reviews insertable by managers" ON hr_performance_reviews
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Performance reviews updatable by managers" ON hr_performance_reviews;
CREATE POLICY "Performance reviews updatable by managers" ON hr_performance_reviews
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Performance reviews deletable by hr" ON hr_performance_reviews;
CREATE POLICY "Performance reviews deletable by hr" ON hr_performance_reviews
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_perf_reviews_member ON hr_performance_reviews(member_id);

-- ============================================================
-- 3. HR Onboarding Tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general' CHECK (category IN ('general','it_setup','hr_docs','training','introduction','access')),
  is_done boolean DEFAULT false,
  due_date date,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Onboarding tasks viewable by managers" ON hr_onboarding_tasks;
CREATE POLICY "Onboarding tasks viewable by managers" ON hr_onboarding_tasks
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Onboarding tasks insertable by hr" ON hr_onboarding_tasks;
CREATE POLICY "Onboarding tasks insertable by hr" ON hr_onboarding_tasks
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Onboarding tasks updatable by hr" ON hr_onboarding_tasks;
CREATE POLICY "Onboarding tasks updatable by hr" ON hr_onboarding_tasks
  FOR UPDATE TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr','manager'))
  );

DROP POLICY IF EXISTS "Onboarding tasks deletable by hr" ON hr_onboarding_tasks;
CREATE POLICY "Onboarding tasks deletable by hr" ON hr_onboarding_tasks
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_onboarding_member ON hr_onboarding_tasks(member_id);

-- ============================================================
-- 4. Marketing Campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  campaign_type text DEFAULT 'digital' CHECK (campaign_type IN ('digital','social','email','content','event','print','mixed')),
  status text DEFAULT 'planning' CHECK (status IN ('planning','active','paused','completed','cancelled')),
  start_date date,
  end_date date,
  budget numeric(14,2) DEFAULT 0,
  spent numeric(14,2) DEFAULT 0,
  target_audience text DEFAULT '',
  channels text[] DEFAULT '{}',
  metrics jsonb DEFAULT '{}'::jsonb,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaigns viewable by authenticated" ON marketing_campaigns;
CREATE POLICY "Campaigns viewable by authenticated" ON marketing_campaigns
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Campaigns insertable by marketing" ON marketing_campaigns;
CREATE POLICY "Campaigns insertable by marketing" ON marketing_campaigns
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','marketing_manager','sales'))
  );

DROP POLICY IF EXISTS "Campaigns updatable by marketing" ON marketing_campaigns;
CREATE POLICY "Campaigns updatable by marketing" ON marketing_campaigns
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','marketing_manager','sales'))
  );

DROP POLICY IF EXISTS "Campaigns deletable by managers" ON marketing_campaigns;
CREATE POLICY "Campaigns deletable by managers" ON marketing_campaigns
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON marketing_campaigns(owner_id);

-- ============================================================
-- 5. Legal Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  document_type text DEFAULT 'contract' CHECK (document_type IN ('contract','policy','agreement','compliance','ip','regulatory','other')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','review','approved','active','expired','archived')),
  counterparty text DEFAULT '',
  effective_date date,
  expiry_date date,
  version text DEFAULT '1.0',
  file_url text DEFAULT '',
  notes text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Legal docs viewable by authenticated" ON legal_documents;
CREATE POLICY "Legal docs viewable by authenticated" ON legal_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Legal docs insertable by legal" ON legal_documents;
CREATE POLICY "Legal docs insertable by legal" ON legal_documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

DROP POLICY IF EXISTS "Legal docs updatable by legal" ON legal_documents;
CREATE POLICY "Legal docs updatable by legal" ON legal_documents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

DROP POLICY IF EXISTS "Legal docs deletable by legal" ON legal_documents;
CREATE POLICY "Legal docs deletable by legal" ON legal_documents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

CREATE INDEX IF NOT EXISTS idx_legal_docs_status ON legal_documents(status);
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(document_type);

-- ============================================================
-- 6. Legal Matters
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  matter_type text DEFAULT 'general' CHECK (matter_type IN ('general','litigation','compliance','ip','contract_dispute','regulatory','employment')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  counterparty text DEFAULT '',
  opened_date date,
  resolved_date date,
  notes text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE legal_matters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Legal matters viewable by authenticated" ON legal_matters;
CREATE POLICY "Legal matters viewable by authenticated" ON legal_matters
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Legal matters insertable by legal" ON legal_matters;
CREATE POLICY "Legal matters insertable by legal" ON legal_matters
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

DROP POLICY IF EXISTS "Legal matters updatable by legal" ON legal_matters;
CREATE POLICY "Legal matters updatable by legal" ON legal_matters
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

DROP POLICY IF EXISTS "Legal matters deletable by legal" ON legal_matters;
CREATE POLICY "Legal matters deletable by legal" ON legal_matters
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','legal_counsel'))
  );

CREATE INDEX IF NOT EXISTS idx_legal_matters_status ON legal_matters(status);

-- ============================================================
-- 7. Sales Opportunities
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  stage text DEFAULT 'lead' CHECK (stage IN ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
  value numeric(14,2) DEFAULT 0,
  probability integer DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  source text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  description text DEFAULT '',
  lost_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Opportunities viewable by authenticated" ON sales_opportunities;
CREATE POLICY "Opportunities viewable by authenticated" ON sales_opportunities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Opportunities insertable by sales" ON sales_opportunities;
CREATE POLICY "Opportunities insertable by sales" ON sales_opportunities
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','sales','marketing_manager'))
  );

DROP POLICY IF EXISTS "Opportunities updatable by sales" ON sales_opportunities;
CREATE POLICY "Opportunities updatable by sales" ON sales_opportunities
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','sales','marketing_manager'))
  );

DROP POLICY IF EXISTS "Opportunities deletable by managers" ON sales_opportunities;
CREATE POLICY "Opportunities deletable by managers" ON sales_opportunities
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON sales_opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON sales_opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON sales_opportunities(customer_id);

-- ============================================================
-- 8. Sales Activities
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES sales_opportunities(id) ON DELETE CASCADE,
  activity_type text DEFAULT 'call' CHECK (activity_type IN ('call','email','meeting','note','demo','proposal_sent')),
  description text DEFAULT '',
  performed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales activities viewable by authenticated" ON sales_activities;
CREATE POLICY "Sales activities viewable by authenticated" ON sales_activities
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales activities insertable by sales" ON sales_activities;
CREATE POLICY "Sales activities insertable by sales" ON sales_activities
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','sales','marketing_manager'))
  );

DROP POLICY IF EXISTS "Sales activities deletable by managers" ON sales_activities;
CREATE POLICY "Sales activities deletable by managers" ON sales_activities
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_sales_activities_opp ON sales_activities(opportunity_id);

-- ============================================================
-- 9. Seed sample data
-- ============================================================
INSERT INTO marketing_campaigns (name, description, campaign_type, status, budget, spent, target_audience, channels)
VALUES
  ('Q3 Product Launch', 'Digital campaign for new product launch', 'digital', 'active', 50000, 18500, 'Tech professionals 25-45', ARRAY['linkedin','twitter','email']),
  ('Brand Awareness Q3', 'Social media brand awareness campaign', 'social', 'active', 25000, 9200, 'General audience', ARRAY['instagram','facebook']),
  ('Email Newsletter', 'Monthly email newsletter to subscribers', 'email', 'active', 5000, 1200, 'Existing customers', ARRAY['email']),
  ('Holiday Promo', 'End of year holiday promotion', 'mixed', 'planning', 35000, 0, 'All segments', ARRAY['email','social','print'])
ON CONFLICT DO NOTHING;

INSERT INTO legal_documents (title, document_type, status, counterparty, effective_date, expiry_date, version)
VALUES
  ('Master Services Agreement', 'contract', 'active', 'Acme Corp', '2025-01-15', '2026-01-14', '2.1'),
  ('Employee Handbook v3', 'policy', 'active', 'Internal', '2025-06-01', NULL, '3.0'),
  ('NDA Template', 'agreement', 'approved', 'Template', '2025-03-10', NULL, '1.2'),
  ('GDPR Compliance Checklist', 'compliance', 'active', 'Internal', '2025-04-01', NULL, '1.0'),
  ('Trademark Registration', 'ip', 'review', 'USPTO', '2025-07-01', NULL, '1.0')
ON CONFLICT DO NOTHING;

INSERT INTO legal_matters (title, description, matter_type, priority, status, counterparty, opened_date)
VALUES
  ('Contract dispute with vendor', 'Dispute over delivery timeline with supplier', 'contract_dispute', 'high', 'in_progress', 'TechSupply Ltd', '2025-06-15'),
  ('Employment claim review', 'Reviewing former employee claim', 'employment', 'medium', 'open', 'Former Employee', '2025-07-01'),
  ('Regulatory filing preparation', 'Preparing annual regulatory filing', 'regulatory', 'medium', 'in_progress', 'RDB', '2025-07-10')
ON CONFLICT DO NOTHING;

INSERT INTO sales_opportunities (name, stage, value, probability, source, description)
VALUES
  ('Acme Corp - Custom Software', 'qualified', 75000, 40, 'Referral', 'Custom software development for logistics'),
  ('TechFlow - Mobile App', 'proposal', 120000, 60, 'Inbound', 'Mobile app development for fintech'),
  ('GlobalNet - Cloud Migration', 'negotiation', 200000, 75, 'Outbound', 'Cloud infrastructure migration'),
  ('StartupX - Website Redesign', 'lead', 15000, 20, 'Inbound', 'Website redesign project'),
  ('Enterprise Co - ERP System', 'closed_won', 350000, 100, 'Referral', 'Full ERP implementation'),
  ('LocalBiz - Support Contract', 'closed_lost', 5000, 0, 'Cold', 'Monthly support contract')
ON CONFLICT DO NOTHING;

INSERT INTO hr_candidates (full_name, email, phone, position, department, stage, source, rating)
VALUES
  ('Alice Johnson', 'alice@email.com', '+250788123456', 'Senior Developer', 'Engineering', 'interview', 'LinkedIn', 4),
  ('Bob Smith', 'bob@email.com', '+250788654321', 'QA Engineer', 'Engineering', 'screening', 'Referral', 3),
  ('Carol Davis', 'carol@email.com', '+250788987654', 'Marketing Manager', 'Marketing', 'applied', 'Job Board', 0),
  ('David Wilson', 'david@email.com', '+250788456789', 'Sales Representative', 'Sales', 'offer', 'Direct', 5),
  ('Eve Brown', 'eve@email.com', '+250788321654', 'HR Specialist', 'HR', 'interview', 'LinkedIn', 4)
ON CONFLICT DO NOTHING;
