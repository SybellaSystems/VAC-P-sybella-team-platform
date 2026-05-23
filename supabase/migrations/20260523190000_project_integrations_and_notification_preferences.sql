-- Add notification preferences and project integration support

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS project_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform text NOT NULL,
  endpoint text NOT NULL,
  auth_type text NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'apikey', 'basic', 'bearer', 'oauth')),
  credentials jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project integrations viewable by authenticated users"
  ON project_integrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/director/manager can insert project integrations"
  ON project_integrations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "Admin/director/manager can update project integrations"
  ON project_integrations FOR UPDATE
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

CREATE POLICY "Admin/director/manager can delete project integrations"
  ON project_integrations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_integrations_project ON project_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_integrations_platform ON project_integrations(platform);
