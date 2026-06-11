/*
  Marketing campaign workspace, content calendar, asset metadata and automation rules
  - Adds marketing campaign tracking tables
  - Adds content calendar items and asset metadata
  - Adds automation rule definitions for reminders and workflow signals
*/

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL CHECK (status IN ('planning', 'active', 'paused', 'completed')),
  owner_id uuid REFERENCES profiles(id),
  start_date date,
  end_date date,
  budget numeric(12,2) DEFAULT 0,
  leads_target integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Marketing campaigns open access" ON marketing_campaigns;
CREATE POLICY "Marketing campaigns open access" ON marketing_campaigns FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Marketing campaigns manage" ON marketing_campaigns;
CREATE POLICY "Marketing campaigns manage" ON marketing_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_owner ON marketing_campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

CREATE TABLE IF NOT EXISTS content_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_date date NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('blog', 'email', 'social', 'event', 'webinar', 'press_release', 'other')),
  owner_id uuid REFERENCES profiles(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_calendar_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Calendar items open access" ON content_calendar_items;
CREATE POLICY "Calendar items open access" ON content_calendar_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Calendar items manage" ON content_calendar_items;
CREATE POLICY "Calendar items manage" ON content_calendar_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_content_calendar_campaign ON content_calendar_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_calendar_date ON content_calendar_items(scheduled_date);

CREATE TABLE IF NOT EXISTS marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid REFERENCES profiles(id),
  preview_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Marketing assets open access" ON marketing_assets;
CREATE POLICY "Marketing assets open access" ON marketing_assets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Marketing assets manage" ON marketing_assets;
CREATE POLICY "Marketing assets manage" ON marketing_assets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_marketing_assets_uploaded_by ON marketing_assets(uploaded_by);

CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('project_due_reminder', 'task_blocked_alert', 'report_followup', 'campaign_progress_alert')),
  target_project_id uuid REFERENCES projects(id),
  schedule text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation rules open access" ON automation_rules;
CREATE POLICY "Automation rules open access" ON automation_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Automation rules manage" ON automation_rules;
CREATE POLICY "Automation rules manage" ON automation_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_automation_rules_project ON automation_rules(target_project_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);

COMMENT ON TABLE marketing_campaigns IS 'Marketing campaign records for the platform marketing operations workspace';
COMMENT ON TABLE content_calendar_items IS 'Scheduled content and executions for marketing campaigns';
COMMENT ON TABLE marketing_assets IS 'Metadata for marketing assets and creative collateral';
COMMENT ON TABLE automation_rules IS 'Rule definitions for workflow reminders and automated follow-up actions';
