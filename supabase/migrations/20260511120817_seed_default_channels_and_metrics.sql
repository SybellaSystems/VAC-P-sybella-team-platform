
/*
  # Seed default channels and company metrics

  Creates default communication channels and initial company metrics for Sybella Systems Ltd.
*/

-- Insert default channels (no auth.uid() needed for seeding)
INSERT INTO channels (id, name, description, type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'general', 'General company-wide discussions', 'public'),
  ('00000000-0000-0000-0000-000000000002', 'engineering', 'Technical discussions and code reviews', 'public'),
  ('00000000-0000-0000-0000-000000000003', 'sales-marketing', 'Sales updates and marketing campaigns', 'public'),
  ('00000000-0000-0000-0000-000000000004', 'hr-admin', 'HR updates and administrative notices', 'public'),
  ('00000000-0000-0000-0000-000000000005', 'finance', 'Financial updates and budget discussions', 'private'),
  ('00000000-0000-0000-0000-000000000006', 'announcements', 'Company-wide announcements', 'public')
ON CONFLICT (id) DO NOTHING;
