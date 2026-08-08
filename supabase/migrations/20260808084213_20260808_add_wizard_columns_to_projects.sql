
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_code text,
  ADD COLUMN IF NOT EXISTS project_type text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deliverables jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS success_criteria jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_price numeric(14,2),
  ADD COLUMN IF NOT EXISTS discount numeric(14,2),
  ADD COLUMN IF NOT EXISTS taxes numeric(14,2),
  ADD COLUMN IF NOT EXISTS expected_revenue numeric(14,2),
  ADD COLUMN IF NOT EXISTS estimated_costs jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS warranty_end timestamptz,
  ADD COLUMN IF NOT EXISTS support_end timestamptz,
  ADD COLUMN IF NOT EXISTS deployment_date timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_end timestamptz,
  ADD COLUMN IF NOT EXISTS communication_channels jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meeting_frequency text,
  ADD COLUMN IF NOT EXISTS escalation_contacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_recipients jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_needed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_person text,
  ADD COLUMN IF NOT EXISTS brand_assets jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS credentials_required jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS git_repo_url text,
  ADD COLUMN IF NOT EXISTS doc_links jsonb DEFAULT '[]'::jsonb;

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_channels_project_id ON channels(project_id);
