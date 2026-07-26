-- Credential Categories
CREATE TABLE IF NOT EXISTS credential_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT 'Key',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credential_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by auth" ON credential_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manages categories" ON credential_categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Credential Vault
CREATE TABLE IF NOT EXISTS credential_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES credential_categories(id),
  description text DEFAULT '',
  platform_name text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  access_level text NOT NULL DEFAULT 'restricted' CHECK (access_level IN ('public', 'restricted', 'admin_only')),
  required_role text DEFAULT 'all',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_by uuid REFERENCES profiles(id),
  last_accessed_at timestamptz
);

ALTER TABLE credential_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all creds" ON credential_vault FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR access_level = 'public'
);

CREATE POLICY "Only admin inserts creds" ON credential_vault FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Credential Access Requests
CREATE TABLE IF NOT EXISTS credential_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES credential_vault(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  reason text DEFAULT '',
  requested_at timestamptz DEFAULT now(),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(credential_id, user_id)
);

ALTER TABLE credential_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own requests" ON credential_access_requests FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
);

CREATE POLICY "Request access" ON credential_access_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Directors approve" ON credential_access_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
);

-- Insert default categories
INSERT INTO credential_categories (name, description, icon) VALUES
('Tech', 'Technical credentials (servers, APIs, databases)', 'Server'),
('Finance', 'Financial platform credentials', 'DollarSign'),
('HR', 'Human resources platforms', 'Users'),
('Marketing', 'Marketing tools and platforms', 'Megaphone'),
('Operations', 'Operational tools and services', 'Settings')
ON CONFLICT (name) DO NOTHING;