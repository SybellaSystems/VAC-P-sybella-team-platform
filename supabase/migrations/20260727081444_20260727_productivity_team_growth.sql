/*
# Productivity & Team Growth Tables

## Overview
Creates tables for OKR/goal tracking, meeting management, action items, skills matrix,
employee recognition, career progression, and resource forecasting.

## New Tables
1. `objectives` - Company, department, and individual OKRs with key results
2. `key_results` - Measurable key results linked to objectives
3. `meetings` - Meeting management with agenda, attendees, minutes
4. `meeting_attendees` - Meeting attendee tracking
5. `meeting_action_items` - Action items from meetings with assignees and due dates
6. `skills_matrix` - Employee skills assessment and proficiency levels
7. `employee_recognition` - Peer recognition and awards
8. `career_progression` - Career path tracking and milestones
9. `resource_forecasts` - Resource demand forecasting per department

## Security
- RLS enabled on all tables
- Authenticated users can read most data
- Users can CRUD their own objectives, recognition
- Managers can manage team objectives, meetings, action items, skills
*/

-- ============================================================
-- 1. Objectives (OKRs)
-- ============================================================
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  level text DEFAULT 'individual' CHECK (level IN ('company','department','team','individual')),
  department text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
  progress numeric(5,2) DEFAULT 0,
  quarter text DEFAULT '',
  year integer DEFAULT EXTRACT(year FROM now()),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Objectives viewable by authenticated" ON objectives;
CREATE POLICY "Objectives viewable by authenticated" ON objectives
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Objectives insertable by authenticated" ON objectives;
CREATE POLICY "Objectives insertable by authenticated" ON objectives
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Objectives updatable by authenticated" ON objectives;
CREATE POLICY "Objectives updatable by authenticated" ON objectives
  FOR UPDATE TO authenticated USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Objectives deletable by managers" ON objectives;
CREATE POLICY "Objectives deletable by managers" ON objectives
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_objectives_owner ON objectives(owner_id);
CREATE INDEX IF NOT EXISTS idx_objectives_level ON objectives(level);

-- ============================================================
-- 2. Key Results
-- ============================================================
CREATE TABLE IF NOT EXISTS key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  metric_type text DEFAULT 'number' CHECK (metric_type IN ('number','percentage','boolean','currency')),
  current_value numeric(14,2) DEFAULT 0,
  target_value numeric(14,2) DEFAULT 100,
  start_value numeric(14,2) DEFAULT 0,
  unit text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','missed')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Key results viewable by authenticated" ON key_results;
CREATE POLICY "Key results viewable by authenticated" ON key_results
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Key results insertable by authenticated" ON key_results;
CREATE POLICY "Key results insertable by authenticated" ON key_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Key results updatable by authenticated" ON key_results;
CREATE POLICY "Key results updatable by authenticated" ON key_results
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Key results deletable by managers" ON key_results;
CREATE POLICY "Key results deletable by managers" ON key_results
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_keyresults_objective ON key_results(objective_id);

-- ============================================================
-- 3. Meetings
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  meeting_type text DEFAULT 'general' CHECK (meeting_type IN ('general','standup','review','planning','retrospective','client','all_hands','one_on_one')),
  organizer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  start_time timestamptz,
  end_time timestamptz,
  location text DEFAULT '',
  agenda text DEFAULT '',
  minutes text DEFAULT '',
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meetings viewable by authenticated" ON meetings;
CREATE POLICY "Meetings viewable by authenticated" ON meetings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Meetings insertable by authenticated" ON meetings;
CREATE POLICY "Meetings insertable by authenticated" ON meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Meetings updatable by authenticated" ON meetings;
CREATE POLICY "Meetings updatable by authenticated" ON meetings
  FOR UPDATE TO authenticated USING (
    auth.uid() = organizer_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Meetings deletable by managers" ON meetings;
CREATE POLICY "Meetings deletable by managers" ON meetings
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start ON meetings(start_time);

-- ============================================================
-- 4. Meeting Attendees
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attendance_status text DEFAULT 'pending' CHECK (attendance_status IN ('pending','confirmed','attended','absent','apologized')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, member_id)
);

ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Meeting attendees viewable by authenticated" ON meeting_attendees;
CREATE POLICY "Meeting attendees viewable by authenticated" ON meeting_attendees
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Meeting attendees insertable by authenticated" ON meeting_attendees;
CREATE POLICY "Meeting attendees insertable by authenticated" ON meeting_attendees
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Meeting attendees updatable by authenticated" ON meeting_attendees;
CREATE POLICY "Meeting attendees updatable by authenticated" ON meeting_attendees
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Meeting attendees deletable by managers" ON meeting_attendees;
CREATE POLICY "Meeting attendees deletable by managers" ON meeting_attendees
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);

-- ============================================================
-- 5. Meeting Action Items
-- ============================================================
CREATE TABLE IF NOT EXISTS meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Action items viewable by authenticated" ON meeting_action_items;
CREATE POLICY "Action items viewable by authenticated" ON meeting_action_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Action items insertable by authenticated" ON meeting_action_items;
CREATE POLICY "Action items insertable by authenticated" ON meeting_action_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Action items updatable by authenticated" ON meeting_action_items;
CREATE POLICY "Action items updatable by authenticated" ON meeting_action_items
  FOR UPDATE TO authenticated USING (
    auth.uid() = assigned_to
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Action items deletable by managers" ON meeting_action_items;
CREATE POLICY "Action items deletable by managers" ON meeting_action_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager'))
  );

CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON meeting_action_items(assigned_to);

-- ============================================================
-- 6. Skills Matrix
-- ============================================================
CREATE TABLE IF NOT EXISTS skills_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency text DEFAULT 'beginner' CHECK (proficiency IN ('beginner','intermediate','advanced','expert')),
  years_experience numeric(3,1) DEFAULT 0,
  last_assessed date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (member_id, skill_name)
);

ALTER TABLE skills_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Skills viewable by authenticated" ON skills_matrix;
CREATE POLICY "Skills viewable by authenticated" ON skills_matrix
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Skills insertable by authenticated" ON skills_matrix;
CREATE POLICY "Skills insertable by authenticated" ON skills_matrix
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Skills updatable by authenticated" ON skills_matrix;
CREATE POLICY "Skills updatable by authenticated" ON skills_matrix
  FOR UPDATE TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Skills deletable by managers" ON skills_matrix;
CREATE POLICY "Skills deletable by managers" ON skills_matrix
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_skills_member ON skills_matrix(member_id);

-- ============================================================
-- 7. Employee Recognition
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_recognition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  given_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  recognition_type text DEFAULT 'kudos' CHECK (recognition_type IN ('kudos','award','milestone','shoutout','bonus')),
  title text NOT NULL,
  description text DEFAULT '',
  badge text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_recognition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recognition viewable by authenticated" ON employee_recognition;
CREATE POLICY "Recognition viewable by authenticated" ON employee_recognition
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Recognition insertable by authenticated" ON employee_recognition;
CREATE POLICY "Recognition insertable by authenticated" ON employee_recognition
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Recognition deletable by admins" ON employee_recognition;
CREATE POLICY "Recognition deletable by admins" ON employee_recognition
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','hr'))
  );

CREATE INDEX IF NOT EXISTS idx_recognition_recipient ON employee_recognition(recipient_id);

-- ============================================================
-- 8. Career Progression
-- ============================================================
CREATE TABLE IF NOT EXISTS career_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  present_role text NOT NULL,
  target_role text DEFAULT '',
  present_level text DEFAULT '',
  target_level text DEFAULT '',
  timeline text DEFAULT '',
  milestones jsonb DEFAULT '[]'::jsonb,
  development_plan text DEFAULT '',
  status text DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  last_reviewed date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Career progression viewable by managers" ON career_progression;
CREATE POLICY "Career progression viewable by managers" ON career_progression
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Career progression insertable by managers" ON career_progression;
CREATE POLICY "Career progression insertable by managers" ON career_progression
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Career progression updatable by managers" ON career_progression;
CREATE POLICY "Career progression updatable by managers" ON career_progression
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Career progression deletable by admins" ON career_progression;
CREATE POLICY "Career progression deletable by admins" ON career_progression
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );

CREATE INDEX IF NOT EXISTS idx_career_member ON career_progression(member_id);

-- ============================================================
-- 9. Resource Forecasts
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  role_needed text DEFAULT '',
  headcount_current integer DEFAULT 0,
  headcount_needed integer DEFAULT 0,
  headcount_gap integer DEFAULT 0,
  period text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE resource_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Forecasts viewable by authenticated" ON resource_forecasts;
CREATE POLICY "Forecasts viewable by authenticated" ON resource_forecasts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Forecasts insertable by managers" ON resource_forecasts;
CREATE POLICY "Forecasts insertable by managers" ON resource_forecasts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Forecasts updatable by managers" ON resource_forecasts;
CREATE POLICY "Forecasts updatable by managers" ON resource_forecasts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Forecasts deletable by admins" ON resource_forecasts;
CREATE POLICY "Forecasts deletable by admins" ON resource_forecasts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director'))
  );
