-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'other' CHECK (entity_type IN ('budget','leave','credential_access','report','other')),
  entity_id text NOT NULL DEFAULT '',
  current_step integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 4,
  workflow_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_workflows_select" ON approval_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_workflows_insert" ON approval_workflows FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "approval_workflows_update" ON approval_workflows FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director','manager','finance','hr')));
CREATE POLICY "approval_workflows_delete" ON approval_workflows FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','director')));

-- Seed from budget_proposals
INSERT INTO approval_workflows (entity_type, entity_id, current_step, total_steps, workflow_name, status, requested_by)
SELECT 'budget', bp.id::text, bp.current_step, bp.total_steps, bp.title, bp.status, bp.proposed_by
FROM budget_proposals bp
WHERE NOT EXISTS (SELECT 1 FROM approval_workflows aw WHERE aw.entity_id = bp.id::text);

-- Also seed from credential_access_requests
INSERT INTO approval_workflows (entity_type, entity_id, current_step, total_steps, workflow_name, status, requested_by)
SELECT 'credential_access', car.id::text, 1, 2, 'Credential Access: ' || cv.name, car.status, car.user_id
FROM credential_access_requests car
JOIN credential_vault cv ON cv.id = car.credential_id
WHERE NOT EXISTS (SELECT 1 FROM approval_workflows aw WHERE aw.entity_id = car.id::text);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id);
