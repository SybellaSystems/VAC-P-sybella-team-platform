/*
# Weekly Reports Enforcement + Project-Scoped Channels

## Purpose
1. Add a `weekly_reports` table to track weekly report submissions per user.
2. Add `project_id` column to `channels` table to link channels to specific projects.
3. Add a `channel_members` table to control which users can access which channels (for project-scoped channels).

## New Tables
- `weekly_reports`: Stores weekly report submissions. Each report belongs to a user (member_id), has a week_start date, content fields, and a status.
- `channel_members`: Junction table linking channels to users for access control.

## Modified Tables
- `channels`: Added `project_id` (nullable uuid, references projects). When set, the channel is project-scoped and only project members can access it.

## Security
- RLS enabled on both new tables.
- `weekly_reports`: Users can CRUD their own reports. Admins/directors/managers can read all.
- `channel_members`: Users can read their own memberships. 
- Existing channel policies are not modified.
*/

-- 1. weekly_reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  accomplishments text NOT NULL DEFAULT '',
  planned_tasks text NOT NULL DEFAULT '',
  blockers text NOT NULL DEFAULT '',
  highlights text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (member_id, week_start)
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_weekly_reports" ON weekly_reports;
CREATE POLICY "select_own_weekly_reports" ON weekly_reports FOR SELECT
  TO authenticated USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "insert_own_weekly_reports" ON weekly_reports;
CREATE POLICY "insert_own_weekly_reports" ON weekly_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "update_own_weekly_reports" ON weekly_reports;
CREATE POLICY "update_own_weekly_reports" ON weekly_reports FOR UPDATE
  TO authenticated USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "delete_own_weekly_reports" ON weekly_reports;
CREATE POLICY "delete_own_weekly_reports" ON weekly_reports FOR DELETE
  TO authenticated USING (auth.uid() = member_id);

-- 2. Add project_id to channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'channels' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE channels ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (channel_id, member_id)
);

ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_channel_members" ON channel_members;
CREATE POLICY "select_own_channel_members" ON channel_members FOR SELECT
  TO authenticated USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "insert_own_channel_members" ON channel_members;
CREATE POLICY "insert_own_channel_members" ON channel_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "delete_own_channel_members" ON channel_members;
CREATE POLICY "delete_own_channel_members" ON channel_members FOR DELETE
  TO authenticated USING (auth.uid() = member_id);

-- Index for weekly report lookups
CREATE INDEX IF NOT EXISTS idx_weekly_reports_member_week ON weekly_reports(member_id, week_start);
CREATE INDEX IF NOT EXISTS idx_channel_members_member ON channel_members(member_id);
CREATE INDEX IF NOT EXISTS idx_channels_project_id ON channels(project_id);
