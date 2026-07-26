-- Extend budget_proposals with approval/rejection tracking
ALTER TABLE budget_proposals
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS impact_analysis text DEFAULT '';

-- Add index for financial_records project lookups
CREATE INDEX IF NOT EXISTS idx_financial_records_project ON financial_records(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_proposals_project ON budget_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_proposals_status ON budget_proposals(status);

-- Update the budget_proposals status constraint to include rejected
ALTER TABLE budget_proposals DROP CONSTRAINT IF EXISTS budget_proposals_status_check;
ALTER TABLE budget_proposals ADD CONSTRAINT budget_proposals_status_check
  CHECK (status IN ('pending','approved','rejected','implemented','cancelled'));
