-- Store last pushed data from external webhook integrations

ALTER TABLE project_integrations
  ADD COLUMN IF NOT EXISTS last_pushed_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_pushed_at timestamptz;

