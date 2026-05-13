-- Roles: legal_counsel, marketing_manager
-- HR pipeline, share allocations (internal + external), project–budget links
-- RLS aligned with app RBAC

-- ---------------------------------------------------------------------------
-- Profiles: extend role enum
-- ---------------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'admin', 'director', 'manager', 'developer', 'designer', 'qa',
    'sales', 'hr', 'finance', 'legal_counsel', 'marketing_manager'
  )
);

-- ---------------------------------------------------------------------------
-- Share allocations (admin assigns to team member or external party)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
  allocation_type text NOT NULL DEFAULT 'internal' CHECK (allocation_type IN ('internal', 'external')),
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  external_party_name text,
  external_party_email text,
  units numeric(20,6) NOT NULL DEFAULT 0,
  share_value numeric(20,6),
  notes text DEFAULT '',
  allocated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT share_alloc_external_chk CHECK (
    allocation_type = 'internal' OR (external_party_name IS NOT NULL AND external_party_name <> '')
  )
);

ALTER TABLE share_allocations DROP CONSTRAINT IF EXISTS share_alloc_external_chk;
ALTER TABLE share_allocations ADD CONSTRAINT share_alloc_body_chk CHECK (
  (allocation_type = 'internal' AND profile_id IS NOT NULL)
  OR (allocation_type = 'external' AND COALESCE(btrim(external_party_name), '') <> '')
);

CREATE INDEX IF NOT EXISTS idx_share_alloc_share ON share_allocations(share_id);
CREATE INDEX IF NOT EXISTS idx_share_alloc_profile ON share_allocations(profile_id);

ALTER TABLE share_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_alloc_select_admin_director_finance"
  ON share_allocations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
    OR profile_id = auth.uid()
  );

CREATE POLICY "share_alloc_insert_admin"
  ON share_allocations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "share_alloc_update_admin"
  ON share_allocations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "share_alloc_delete_admin"
  ON share_allocations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- HR: candidates pipeline
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role_applied text DEFAULT '',
  stage text NOT NULL DEFAULT 'applied' CHECK (
    stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')
  ),
  notes text DEFAULT '',
  assigned_hr uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_candidates_select"
  ON hr_candidates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

CREATE POLICY "hr_candidates_insert"
  ON hr_candidates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr'))
  );

CREATE POLICY "hr_candidates_update"
  ON hr_candidates FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

-- ---------------------------------------------------------------------------
-- HR: performance reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id),
  period_label text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  goals text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'acknowledged')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_reviews_select"
  ON hr_performance_reviews FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager'))
  );

CREATE POLICY "hr_reviews_insert"
  ON hr_performance_reviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  );

CREATE POLICY "hr_reviews_update"
  ON hr_performance_reviews FOR UPDATE TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR member_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    OR member_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager', 'director'))
  );

-- ---------------------------------------------------------------------------
-- HR: onboarding checklist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  is_done boolean DEFAULT false,
  due_date date,
  assigned_to uuid REFERENCES profiles(id),
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hr_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_onb_select"
  ON hr_onboarding_tasks FOR SELECT TO authenticated
  USING (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

CREATE POLICY "hr_onb_insert"
  ON hr_onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

CREATE POLICY "hr_onb_update"
  ON hr_onboarding_tasks FOR UPDATE TO authenticated
  USING (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  )
  WITH CHECK (
    member_id = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'hr', 'manager'))
  );

-- ---------------------------------------------------------------------------
-- Project ↔ Budget proposal linkage (PM / finance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_budget_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  budget_proposal_id uuid NOT NULL REFERENCES budget_proposals(id) ON DELETE CASCADE,
  link_role text DEFAULT 'allocation',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, budget_proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_project_budget_project ON project_budget_links(project_id);

ALTER TABLE project_budget_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pbl_select_auth"
  ON project_budget_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "pbl_insert_leads"
  ON project_budget_links FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

CREATE POLICY "pbl_delete_leads"
  ON project_budget_links FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- Shares: allow admin to manage share classes (widen from prior migration)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "shares_select_superadmin_only" ON shares;
DROP POLICY IF EXISTS "shares_insert_superadmin_only" ON shares;
CREATE POLICY "shares_insert_admin"
  ON shares FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "shares_select_superadmin_only" ON shares;
CREATE POLICY "shares_select_finance_admin_director"
  ON shares FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

-- Ownership records: finance read, admin write
DROP POLICY IF EXISTS "ownership_select_superadmin_only" ON ownership_records;
DROP POLICY IF EXISTS "ownership_insert_superadmin_only" ON ownership_records;
CREATE POLICY "ownership_select_scope"
  ON ownership_records FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'finance'))
  );

CREATE POLICY "ownership_insert_admin"
  ON ownership_records FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Wiki: marketing + legal can author
DROP POLICY IF EXISTS "wiki_pages_insert_own_or_superadmin" ON wiki_pages;
CREATE POLICY "wiki_pages_insert_authors"
  ON wiki_pages FOR INSERT TO authenticated
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  );

DROP POLICY IF EXISTS "wiki_pages_update_own_or_superadmin" ON wiki_pages;
CREATE POLICY "wiki_pages_update_authors"
  ON wiki_pages FOR UPDATE TO authenticated
  USING (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  )
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'hr', 'marketing_manager', 'legal_counsel')
    )
  );

-- Repo links: managers can add
DROP POLICY IF EXISTS "repo_links_insert_own_or_superadmin" ON repo_links;
CREATE POLICY "repo_links_insert_scope"
  ON repo_links FOR INSERT TO authenticated
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager', 'developer')
    )
  );

DROP POLICY IF EXISTS "repo_links_update_own_or_superadmin" ON repo_links;
CREATE POLICY "repo_links_update_scope"
  ON repo_links FOR UPDATE TO authenticated
  USING (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager')
    )
  )
  WITH CHECK (
    created_by_auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'manager', 'marketing_manager')
    )
  );

-- Leave: managers see team (simplified: all managers see all pending for approval assist)
DROP POLICY IF EXISTS "leave_requests_select_own_or_superadmin" ON leave_requests;
CREATE POLICY "leave_requests_select_scope"
  ON leave_requests FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager', 'finance')
    )
  );

DROP POLICY IF EXISTS "leave_requests_update_hr_or_admin" ON leave_requests;
DROP POLICY IF EXISTS "leave_requests_update_manager_escalation" ON leave_requests;
CREATE POLICY "leave_requests_update_approvers"
  ON leave_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'director', 'hr', 'manager')
    )
  );

-- Budget proposals: managers create/link
-- (already have insert own - ensure manager in select - prior migration had manager in select)

-- Approval workflow: allow role-matched users to update their step (by required_role)
DROP POLICY IF EXISTS "approval_workflows_update_scope" ON approval_workflows;
CREATE POLICY "approval_workflows_update_by_role"
  ON approval_workflows FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      required_role IS NOT NULL
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = required_role)
    )
    OR reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('director', 'finance'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR (
      required_role IS NOT NULL
      AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role::text = required_role)
    )
    OR reviewer_auth_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('director', 'finance'))
  );
