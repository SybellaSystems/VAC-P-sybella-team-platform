/*
# Daily Check-In / Check-Out System

## Overview
Creates tables for daily check-in (morning) and check-out (evening) for every team member.
This ensures managers understand planned work before execution begins and captures
what was accomplished at the end of each day.

## New Tables
1. `daily_check_ins` - Morning check-in with availability, priorities, deliverables,
   planned meetings, known blockers, and assistance required.
2. `daily_check_outs` - Evening check-out with work completed, deliverables produced,
   time spent, outstanding work, challenges, tomorrow's priorities, and lessons learned.

## Security
- RLS enabled on both tables
- Users can CRUD their own check-ins/outs
- Managers/admins/directors/HR can read all check-ins/outs
*/

CREATE TABLE IF NOT EXISTS daily_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  availability text DEFAULT 'available' CHECK (availability IN ('available','busy','away','sick','leave')),
  priorities text DEFAULT '',
  expected_deliverables text DEFAULT '',
  planned_meetings text DEFAULT '',
  known_blockers text DEFAULT '',
  assistance_required text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (member_id, check_in_date)
);

ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Check-ins viewable by managers" ON daily_check_ins;
CREATE POLICY "Check-ins viewable by managers" ON daily_check_ins
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Check-ins insertable by owner" ON daily_check_ins;
CREATE POLICY "Check-ins insertable by owner" ON daily_check_ins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Check-ins updatable by owner" ON daily_check_ins;
CREATE POLICY "Check-ins updatable by owner" ON daily_check_ins
  FOR UPDATE TO authenticated USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Check-ins deletable by owner" ON daily_check_ins;
CREATE POLICY "Check-ins deletable by owner" ON daily_check_ins
  FOR DELETE TO authenticated USING (auth.uid() = member_id);

CREATE INDEX IF NOT EXISTS idx_checkins_member ON daily_check_ins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_check_ins(check_in_date);

-- ============================================================
CREATE TABLE IF NOT EXISTS daily_check_outs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_out_date date NOT NULL,
  work_completed text DEFAULT '',
  deliverables_produced text DEFAULT '',
  time_spent_hours numeric(5,2) DEFAULT 0,
  outstanding_work text DEFAULT '',
  challenges_encountered text DEFAULT '',
  tomorrow_priorities text DEFAULT '',
  lessons_learned text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (member_id, check_out_date)
);

ALTER TABLE daily_check_outs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Check-outs viewable by managers" ON daily_check_outs;
CREATE POLICY "Check-outs viewable by managers" ON daily_check_outs
  FOR SELECT TO authenticated USING (
    auth.uid() = member_id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','hr'))
  );

DROP POLICY IF EXISTS "Check-outs insertable by owner" ON daily_check_outs;
CREATE POLICY "Check-outs insertable by owner" ON daily_check_outs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Check-outs updatable by owner" ON daily_check_outs;
CREATE POLICY "Check-outs updatable by owner" ON daily_check_outs
  FOR UPDATE TO authenticated USING (auth.uid() = member_id) WITH CHECK (auth.uid() = member_id);

DROP POLICY IF EXISTS "Check-outs deletable by owner" ON daily_check_outs;
CREATE POLICY "Check-outs deletable by owner" ON daily_check_outs
  FOR DELETE TO authenticated USING (auth.uid() = member_id);

CREATE INDEX IF NOT EXISTS idx_checkouts_member ON daily_check_outs(member_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_date ON daily_check_outs(check_out_date);
