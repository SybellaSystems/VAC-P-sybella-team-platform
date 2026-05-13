/*
  HQ enhancements: task subtasks, project cross-links, task status values,
  and RLS adjustments for approvals, repo links, leave, audit visibility.
*/

-- ---------------------------------------------------------------------------
-- Task subtasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')),
  sort_order int NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_subtasks_select_auth"
  ON task_subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "task_subtasks_insert_auth"
  ON task_subtasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "task_subtasks_update_managers_or_task_party"
  ON task_subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  );

CREATE POLICY "task_subtasks_delete_managers_or_task_party"
  ON task_subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_subtasks.task_id
      AND (
        auth.uid() = t.created_by
        OR auth.uid() = t.assigned_to
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Extend task statuses (started / cancelled)
-- ---------------------------------------------------------------------------
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
  status IN ('todo', 'started', 'in_progress', 'review', 'done', 'blocked', 'cancelled')
);

-- ---------------------------------------------------------------------------
-- Cross-feature links from projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_feature_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature_type text NOT NULL CHECK (
    feature_type IN ('customer', 'financial_record', 'budget_proposal', 'wiki_page', 'repo_link')
  ),
  feature_id uuid NOT NULL,
  note text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, feature_type, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_project_feature_links_project ON project_feature_links(project_id);

ALTER TABLE project_feature_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_feature_links_select_auth"
  ON project_feature_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "project_feature_links_insert_leads"
  ON project_feature_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "project_feature_links_update_leads"
  ON project_feature_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

CREATE POLICY "project_feature_links_delete_leads"
  ON project_feature_links FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- Repo links: readable by all authenticated users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "repo_links_select_published_or_superadmin" ON repo_links;
CREATE POLICY "repo_links_select_authenticated"
  ON repo_links FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Budget proposals: finance leadership visibility
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "budget_proposals_select_own_or_superadmin" ON budget_proposals;
CREATE POLICY "budget_proposals_select_scope"
  ON budget_proposals FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

CREATE POLICY "budget_proposals_update_scope"
  ON budget_proposals FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  );

-- ---------------------------------------------------------------------------
-- Approval workflows: proposer + finance chain visibility
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "approval_workflows_select_reviewer_or_superadmin" ON approval_workflows;
CREATE POLICY "approval_workflows_select_scope"
  ON approval_workflows FOR SELECT
  TO authenticated
  USING (
    reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM budget_proposals bp
      WHERE bp.id = approval_workflows.budget_proposal_id
      AND bp.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('director', 'finance', 'manager')
    )
  );

DROP POLICY IF EXISTS "approval_workflows_insert_superadmin_only" ON approval_workflows;
CREATE POLICY "approval_workflows_insert_scope"
  ON approval_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1 FROM budget_proposals bp
      WHERE bp.id = budget_proposal_id AND bp.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('director', 'finance')
    )
  );

DROP POLICY IF EXISTS "approval_workflows_update_reviewer_or_superadmin" ON approval_workflows;
CREATE POLICY "approval_workflows_update_scope"
  ON approval_workflows FOR UPDATE
  TO authenticated
  USING (
    reviewer_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  )
  WITH CHECK (
    reviewer_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance')
    )
  );

-- ---------------------------------------------------------------------------
-- Leave requests: HR / leadership can approve
-- ---------------------------------------------------------------------------
CREATE POLICY "leave_requests_update_hr_or_admin"
  ON leave_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr')
    )
  );

-- ---------------------------------------------------------------------------
-- Audit logs: directors can review org trail
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select_own_or_superadmin" ON audit_logs;
CREATE POLICY "audit_logs_select_scope"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')
    )
  );
