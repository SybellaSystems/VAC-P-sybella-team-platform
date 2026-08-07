/*
# Strict Weekly Report Enforcement, Project-Scoped Channel Access, Task Delete Policy

## Summary
This migration tightens security for channel-based messaging so that only project members
can access channels linked to a project, and adds a DELETE policy for tasks so users can
remove tasks they created or are assigned to (or that managers/admins can delete any task).

## Changes

### 1. Channel SELECT policy — project-scoped access
- Drops the old "Channels viewable by authenticated users" policy (USING true — anyone sees everything).
- Adds "select_project_or_public_channels": users can see:
  a) Channels with no project_id (general/standalone channels) — visible to all authenticated users.
  b) Channels linked to a project where the user is a member of project_assignments for that project.
  c) Channels the user is an explicit member of via channel_members.
  d) Channels the user created.

### 2. Messages SELECT policy — project-scoped access
- Drops the old "Messages viewable by authenticated users" policy (USING true).
- Adds "select_channel_messages": users can read messages in channels they are allowed to see
  (same logic as channel SELECT: public/no-project channels, project member channels,
  channel_members, or channel creator).

### 3. Channel INSERT policy — keep but tighten
- Drops "Authenticated users can create channels" (USING auth.uid() IS NOT NULL — too loose).
- Adds "insert_channels_authenticated": any authenticated user can still create channels,
  but this is the explicit policy.

### 4. Messages INSERT — keep existing (auth.uid() = sender_id)

### 5. Tasks DELETE policy
- Adds "delete_own_or_managed_tasks": users can delete tasks they created, are assigned to,
  or if they are admin/director/manager.

### 6. Channel_members SELECT — tighten
- Drops "Channel members viewable by authenticated users" (USING true).
- Keeps "select_own_channel_members" (auth.uid() = member_id).
- Adds "select_channel_members_for_accessible_channels": users can see channel_members
  for channels they can access (same access logic as channels).

## Security
- RLS already enabled on channels, messages, channel_members, tasks, weekly_reports.
- No new tables created.
- No data lost — only policy changes.
*/

-- =========================================================
-- 1. CHANNEL SELECT — project-scoped access
-- =========================================================
DROP POLICY IF EXISTS "Channels viewable by authenticated users" ON channels;

CREATE POLICY "select_project_or_public_channels"
ON channels FOR SELECT
TO authenticated
USING (
  project_id IS NULL
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM channel_members cm
    WHERE cm.channel_id = channels.id AND cm.member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM project_assignments pa
    WHERE pa.project_id = channels.project_id AND pa.member_id = auth.uid()
  )
);

-- =========================================================
-- 2. CHANNEL INSERT — keep authenticated-only
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;

CREATE POLICY "insert_channels_authenticated"
ON channels FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================
-- 3. MESSAGES SELECT — only messages in accessible channels
-- =========================================================
DROP POLICY IF EXISTS "Messages viewable by authenticated users" ON messages;

CREATE POLICY "select_channel_messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = messages.channel_id
    AND (
      c.project_id IS NULL
      OR c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = c.id AND cm.member_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = c.project_id AND pa.member_id = auth.uid()
      )
    )
  )
);

-- =========================================================
-- 4. TASKS DELETE — owner, assignee, or manager+
-- =========================================================
DROP POLICY IF EXISTS "delete_own_or_managed_tasks" ON tasks;

CREATE POLICY "delete_own_or_managed_tasks"
ON tasks FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = ANY (ARRAY['admin', 'director', 'manager'])
  )
);

-- =========================================================
-- 5. CHANNEL_MEMBERS SELECT — tighten to accessible channels
-- =========================================================
DROP POLICY IF EXISTS "Channel members viewable by authenticated users" ON channel_members;

CREATE POLICY "select_channel_members_for_accessible_channels"
ON channel_members FOR SELECT
TO authenticated
USING (
  member_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = channel_members.channel_id
    AND (
      c.project_id IS NULL
      OR c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = c.project_id AND pa.member_id = auth.uid()
      )
    )
  )
);

-- =========================================================
-- 6. MESSAGES INSERT — keep existing policy but ensure it's scoped
-- The existing "Authenticated users can send messages" checks auth.uid() = sender_id.
-- We should also ensure the sender can only post to channels they can access.
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;

CREATE POLICY "insert_messages_accessible_channels"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM channels c
    WHERE c.id = messages.channel_id
    AND (
      c.project_id IS NULL
      OR c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM channel_members cm
        WHERE cm.channel_id = c.id AND cm.member_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM project_assignments pa
        WHERE pa.project_id = c.project_id AND pa.member_id = auth.uid()
      )
    )
  )
);
