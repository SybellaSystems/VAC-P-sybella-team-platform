/*
# Project Access Control

## Overview
Creates a project_access_grants table for project-specific access overrides.
This allows granting access to users who are not assigned team members, while
the base RLS policies ensure only assigned team members, PMs, department managers,
executives, and admins can access project workspace data by default.

## New Tables
1. `project_access_grants` - Explicit access grants for users who need access to a
   project but are not team members. Supports read/write/manage permission levels.
   Granted by admins/directors/managers.

## Security
- RLS enabled on project_access_grants
- All authenticated users can read grants (needed to determine access)
- Admin/director/manager can create/update/delete grants
*/

CREATE TABLE IF NOT EXISTS project_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_level text DEFAULT 'read' CHECK (access_level IN ('read','write','manage')),
  granted_by uuid REFERENCES profiles(id),
  reason text DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE project_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Access grants viewable by authenticated" ON project_access_grants;
CREATE POLICY "Access grants viewable by authenticated" ON project_access_grants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Access grants insertable by managers" ON project_access_grants;
CREATE POLICY "Access grants insertable by managers" ON project_access_grants
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

DROP POLICY IF EXISTS "Access grants updatable by managers" ON project_access_grants;
CREATE POLICY "Access grants updatable by managers" ON project_access_grants
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

DROP POLICY IF EXISTS "Access grants deletable by managers" ON project_access_grants;
CREATE POLICY "Access grants deletable by managers" ON project_access_grants
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_access_grants_project ON project_access_grants(project_id);
CREATE INDEX IF NOT EXISTS idx_access_grants_user ON project_access_grants(user_id);
