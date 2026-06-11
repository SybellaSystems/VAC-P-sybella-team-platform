-- Migration: align profiles.role check constraint with application roles
-- created: 2026-06-11

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN (
    'admin', 'director', 'manager', 'developer', 'designer', 'qa',
    'sales', 'hr', 'finance', 'legal_counsel', 'marketing_manager',
    'customer_support', 'operations', 'ceo', 'owner'
  )
);
