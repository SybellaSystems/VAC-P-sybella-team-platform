/*
  Project Import/Export and Analytics Enhancement
  - Support for CSV/Excel data import
  - Custom project columns
  - Project templates
  - Enhanced task tracking with messages
  - Project analytics
*/

-- Add columns to projects table for import/export metadata
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS import_source text CHECK (import_source IN ('manual', 'csv', 'excel', 'api', NULL)),
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS raw_import_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS column_mapping jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_name text,
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('marketing', 'development', 'sales', 'operations', 'hr', 'finance', 'general', NULL));

-- Create project_custom_fields table for storing dynamic columns
CREATE TABLE IF NOT EXISTS project_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox', 'currency')),
  field_label text NOT NULL,
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, field_name)
);

ALTER TABLE project_custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Custom fields viewable by authenticated users" ON project_custom_fields;
CREATE POLICY "Custom fields viewable by authenticated users"
  ON project_custom_fields FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Project admins can manage custom fields" ON project_custom_fields;
CREATE POLICY "Project admins can manage custom fields"
  ON project_custom_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      JOIN profiles p ON p.id = auth.uid()
      WHERE pa.project_id = project_custom_fields.project_id
      AND (pa.role_in_project = 'admin' OR p.role IN ('admin', 'director', 'manager'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      JOIN profiles p ON p.id = auth.uid()
      WHERE pa.project_id = project_custom_fields.project_id
      AND (pa.role_in_project = 'admin' OR p.role IN ('admin', 'director', 'manager'))
    )
  );

-- Create project_rows table for imported data rows
CREATE TABLE IF NOT EXISTS project_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project rows viewable by project members" ON project_rows;
CREATE POLICY "Project rows viewable by project members"
  ON project_rows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = project_rows.project_id
      AND member_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles prof ON prof.id = auth.uid()
      WHERE p.id = project_rows.project_id
      AND prof.role IN ('admin', 'director', 'manager')
    )
  );

-- Enhance tasks table with additional tracking fields
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS message_context text,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS actual_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS visible_in_chat boolean DEFAULT true;

-- Create task_messages table for task-related messages
CREATE TABLE IF NOT EXISTS task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES channels(id),
  message_text text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task messages viewable by authenticated users" ON task_messages;
CREATE POLICY "Task messages viewable by authenticated users"
  ON task_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create task messages" ON task_messages;
CREATE POLICY "Authenticated users can create task messages"
  ON task_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create project_analytics table for tracking metrics
CREATE TABLE IF NOT EXISTS project_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric DEFAULT 0,
  metric_date date NOT NULL,
  dimension_1 text,
  dimension_2 text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, metric_name, metric_date, dimension_1, dimension_2)
);

ALTER TABLE project_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Analytics viewable by project members" ON project_analytics;
CREATE POLICY "Analytics viewable by project members"
  ON project_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = project_analytics.project_id
      AND member_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles prof ON prof.id = auth.uid()
      WHERE p.id = project_analytics.project_id
      AND prof.role IN ('admin', 'director', 'manager')
    )
  );

-- Create import_jobs table to track data imports
CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  total_rows integer,
  imported_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Import jobs viewable by project members" ON import_jobs;
CREATE POLICY "Import jobs viewable by project members"
  ON import_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments
      WHERE project_id = import_jobs.project_id
      AND member_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles prof ON prof.id = auth.uid()
      WHERE p.id = import_jobs.project_id
      AND prof.role IN ('admin', 'director', 'manager')
    )
  );

DROP POLICY IF EXISTS "Project admins can manage import jobs" ON import_jobs;
CREATE POLICY "Project admins can manage import jobs"
  ON import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      JOIN profiles p ON p.id = auth.uid()
      WHERE pa.project_id = import_jobs.project_id
      AND (pa.role_in_project = 'admin' OR p.role IN ('admin', 'director', 'manager'))
    )
  );

-- Create project_templates table
CREATE TABLE IF NOT EXISTS project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text CHECK (category IN ('marketing', 'development', 'sales', 'operations', 'hr', 'finance', 'general')),
  structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_fields jsonb DEFAULT '[]'::jsonb,
  is_public boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public templates viewable by authenticated users" ON project_templates;
CREATE POLICY "Public templates viewable by authenticated users"
  ON project_templates FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create templates" ON project_templates;
CREATE POLICY "Authenticated users can create templates"
  ON project_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add RBAC level to project_assignments
ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS can_edit_tasks boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_project boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_members boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_analytics boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_import_export boolean DEFAULT false;

-- Update project_assignments role check
ALTER TABLE project_assignments
  DROP CONSTRAINT IF EXISTS check_role;

ALTER TABLE project_assignments
  ADD CONSTRAINT check_role CHECK (role_in_project IN ('viewer', 'editor', 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_is_template ON projects(is_template);
CREATE INDEX IF NOT EXISTS idx_project_custom_fields_project ON project_custom_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rows_project ON project_rows(project_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_task ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_project_analytics_project ON project_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_project ON import_jobs(project_id);

-- Add comment for documentation
COMMENT ON TABLE projects IS 'Extended projects table with import/export and template support';
COMMENT ON TABLE project_custom_fields IS 'Dynamic columns for imported project data';
COMMENT ON TABLE project_rows IS 'Imported data rows for projects';
COMMENT ON TABLE task_messages IS 'Messages linked to tasks visible in chat';
COMMENT ON TABLE project_analytics IS 'Analytics metrics tracked per project';
COMMENT ON TABLE import_jobs IS 'Track data import jobs and their status';
COMMENT ON TABLE project_templates IS 'Reusable project templates for quick creation';
