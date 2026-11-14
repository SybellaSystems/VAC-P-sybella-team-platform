CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'technical',
  lead_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.departments (name, category)
SELECT DISTINCT trim(department), CASE
  WHEN lower(trim(department)) IN ('executive', 'md office', 'administration') THEN 'executive'
  WHEN lower(trim(department)) IN ('marketing', 'sales & marketing') THEN 'marketing'
  WHEN lower(trim(department)) IN ('legal', 'legal counsel') THEN 'legal'
  WHEN lower(trim(department)) IN ('project', 'project office') THEN 'project'
  WHEN lower(trim(department)) IN ('product', 'product office') THEN 'product'
  ELSE 'technical'
END
FROM public.profiles
WHERE trim(coalesce(department, '')) <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_deleted_at timestamptz;

UPDATE public.profiles p
SET department_id = d.id
FROM public.departments d
WHERE p.department_id IS NULL AND lower(trim(p.department)) = lower(d.name);

CREATE OR REPLACE FUNCTION public.vacp_user_role(p_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = p_user_id
$$;

CREATE OR REPLACE FUNCTION public.vacp_user_department_id(p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = p_user_id
$$;

CREATE OR REPLACE FUNCTION public.vacp_partner_has_department(p_department_id uuid, p_partner_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_department_access
    WHERE partner_id = p_partner_id AND department_id = p_department_id
  )
$$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'director', 'manager', 'developer', 'designer', 'qa', 'sales', 'hr',
    'finance', 'legal_counsel', 'marketing_manager', 'customer_support', 'operations',
    'ceo', 'intern', 'partner', 'executive', 'marketing', 'technical', 'legal',
    'project', 'product', 'deleted'
  ));

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Departments visible to authorized users" ON public.departments;
CREATE POLICY "Departments visible to authorized users"
  ON public.departments FOR SELECT TO authenticated
  USING (
    public.vacp_user_role() IN ('admin', 'director')
    OR public.vacp_user_department_id() = departments.id
  );
DROP POLICY IF EXISTS "Administrators manage departments" ON public.departments;
CREATE POLICY "Administrators manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.vacp_user_role() IN ('admin', 'director'))
  WITH CHECK (public.vacp_user_role() IN ('admin', 'director'));

CREATE OR REPLACE FUNCTION public.vacp_protect_profile_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_manage boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'director')
  ) INTO v_can_manage;

  IF NOT v_can_manage AND current_user NOT IN ('postgres', 'service_role') AND (
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.department IS DISTINCT FROM OLD.department
    OR NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id
    OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
    OR NEW.is_md IS DISTINCT FROM OLD.is_md
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION 'Only administrators and directors can change access or employment fields';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.partner_department_access (
  partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, department_id)
);
ALTER TABLE public.partner_department_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners see own department grants" ON public.partner_department_access;
CREATE POLICY "Partners see own department grants"
  ON public.partner_department_access FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));

DROP POLICY IF EXISTS "Partner department access to directories" ON public.departments;
CREATE POLICY "Partner department access to directories"
  ON public.departments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.partner_department_access a WHERE a.partner_id = auth.uid() AND a.department_id = departments.id));
DROP POLICY IF EXISTS "Administrators grant partner access" ON public.partner_department_access;
CREATE POLICY "Administrators grant partner access"
  ON public.partner_department_access FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = partner_department_access.partner_id AND p.role = 'partner')
  );

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles visible by department and partner grants"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles viewer WHERE viewer.id = auth.uid() AND viewer.role IN ('admin', 'director'))
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.role <> 'partner'
        AND viewer.department_id IS NOT NULL AND viewer.department_id = profiles.department_id
    )
    OR EXISTS (
      SELECT 1 FROM public.partner_department_access access
      WHERE access.partner_id = auth.uid() AND access.department_id = profiles.department_id
    )
  );

CREATE TABLE IF NOT EXISTS public.drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.drive_folders(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drive_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.drive_folders(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  drive_url text NOT NULL CHECK (drive_url ~* '^https?://'),
  preview_url text CHECK (preview_url IS NULL OR preview_url ~* '^https?://'),
  mime_type text NOT NULL DEFAULT '',
  modified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drive_document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.drive_documents(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body varchar(280) NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 280),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_document_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Department and partner folders readable" ON public.drive_folders;
CREATE POLICY "Department and partner folders readable"
  ON public.drive_folders FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.department_id = drive_folders.department_id)
    OR EXISTS (SELECT 1 FROM public.partner_department_access a WHERE a.partner_id = auth.uid() AND a.department_id = drive_folders.department_id)
  );
DROP POLICY IF EXISTS "Administrators manage folders" ON public.drive_folders;
CREATE POLICY "Administrators manage folders"
  ON public.drive_folders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));

DROP POLICY IF EXISTS "Department and partner documents readable" ON public.drive_documents;
CREATE POLICY "Department and partner documents readable"
  ON public.drive_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
    OR EXISTS (
      SELECT 1
      FROM public.drive_folders f
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = drive_documents.folder_id AND p.department_id = f.department_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.drive_folders f
      JOIN public.partner_department_access a ON a.department_id = f.department_id
      WHERE f.id = drive_documents.folder_id AND a.partner_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Administrators manage documents" ON public.drive_documents;
CREATE POLICY "Administrators manage documents"
  ON public.drive_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));
DROP POLICY IF EXISTS "Department members add file references" ON public.drive_documents;
CREATE POLICY "Department members add file references"
  ON public.drive_documents FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.drive_folders f
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE f.id = drive_documents.folder_id AND f.department_id = p.department_id
    )
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role <> 'partner')
  );

DROP POLICY IF EXISTS "Comments visible with document access" ON public.drive_document_comments;
CREATE POLICY "Comments visible with document access"
  ON public.drive_document_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drive_documents d WHERE d.id = drive_document_comments.document_id));
DROP POLICY IF EXISTS "Users comment on accessible documents" ON public.drive_document_comments;
CREATE POLICY "Users comment on accessible documents"
  ON public.drive_document_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.drive_documents d WHERE d.id = drive_document_comments.document_id)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role <> 'partner')
  );
DROP POLICY IF EXISTS "Authors edit own document comments" ON public.drive_document_comments;
CREATE POLICY "Authors edit own document comments"
  ON public.drive_document_comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.platform_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL CHECK (length(trim(platform_name)) BETWEEN 1 AND 80),
  login_url text NOT NULL CHECK (login_url ~* '^https?://'),
  visibility_scope text NOT NULL DEFAULT 'department' CHECK (visibility_scope IN ('all', 'department', 'individual')),
  department_id uuid REFERENCES public.departments(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  is_active boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((visibility_scope <> 'department') OR department_id IS NOT NULL)
);
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Approved platform links visible by scope" ON public.platform_accounts;
CREATE POLICY "Approved platform links visible by scope"
  ON public.platform_accounts FOR SELECT TO authenticated
  USING (
    (is_active AND approved_by IS NOT NULL AND (
      visibility_scope = 'all'
      OR (visibility_scope = 'individual' AND owner_id = auth.uid())
      OR (visibility_scope = 'department' AND (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.department_id = platform_accounts.department_id)
        OR EXISTS (SELECT 1 FROM public.partner_department_access a WHERE a.partner_id = auth.uid() AND a.department_id = platform_accounts.department_id)
      ))
    ))
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director'))
  );
DROP POLICY IF EXISTS "Members suggest platform links" ON public.platform_accounts;
CREATE POLICY "Members suggest platform links"
  ON public.platform_accounts FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND approved_by IS NULL);
DROP POLICY IF EXISTS "Administrators approve platform links" ON public.platform_accounts;
CREATE POLICY "Administrators approve platform links"
  ON public.platform_accounts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));

CREATE TABLE IF NOT EXISTS public.user_activity_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_key uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  active_seconds integer NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  closed_at timestamptz,
  UNIQUE (user_id, session_key)
);
CREATE INDEX IF NOT EXISTS user_activity_sessions_started_idx ON public.user_activity_sessions (started_at DESC);
ALTER TABLE public.user_activity_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users and managers view activity sessions" ON public.user_activity_sessions;
CREATE POLICY "Users and managers view activity sessions"
  ON public.user_activity_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      JOIN public.profiles subject ON subject.id = user_activity_sessions.user_id
      WHERE viewer.id = auth.uid()
        AND (viewer.role IN ('admin', 'director') OR (viewer.department_id = subject.department_id AND viewer.department_id IS NOT NULL))
    )
  );

DROP POLICY IF EXISTS "Partners view shared department KPI definitions" ON public.daily_kpis;
CREATE POLICY "Partners view shared department KPI definitions"
  ON public.daily_kpis FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles subject
      JOIN public.partner_department_access a ON a.department_id = subject.department_id
      WHERE subject.id = daily_kpis.user_id AND a.partner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners view shared department daily entries" ON public.daily_entries;
CREATE POLICY "Partners view shared department daily entries"
  ON public.daily_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles subject
      JOIN public.partner_department_access a ON a.department_id = subject.department_id
      WHERE subject.id = daily_entries.user_id AND a.partner_id = auth.uid() AND daily_entries.status = 'approved'
    )
  );
DROP POLICY IF EXISTS "Department members view approved team reports" ON public.daily_entries;
CREATE POLICY "Department members view approved team reports"
  ON public.daily_entries FOR SELECT TO authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.profiles subject
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE subject.id = daily_entries.user_id
        AND subject.department_id IS NOT NULL
        AND subject.department_id = viewer.department_id
        AND viewer.role <> 'partner'
    )
  );

DROP POLICY IF EXISTS "Partners view shared department entry items" ON public.daily_entry_items;
CREATE POLICY "Partners view shared department entry items"
  ON public.daily_entry_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries entry
      JOIN public.profiles subject ON subject.id = entry.user_id
      JOIN public.partner_department_access a ON a.department_id = subject.department_id
      WHERE entry.id = daily_entry_items.entry_id AND a.partner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.vacp_heartbeat_activity(p_session_key uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_session_key IS NULL THEN
    RAISE EXCEPTION 'Authentication and a session identifier are required';
  END IF;
  INSERT INTO public.user_activity_sessions (user_id, session_key)
  SELECT auth.uid(), p_session_key
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = true
  ON CONFLICT (user_id, session_key) DO UPDATE
  SET active_seconds = user_activity_sessions.active_seconds
        + least(300, greatest(0, floor(extract(epoch FROM (now() - user_activity_sessions.last_seen_at)))::integer)),
      last_seen_at = now(),
      closed_at = NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profile_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('requested', 'completed')),
  retained_data_note text NOT NULL DEFAULT 'Historical reports and approvals retained with anonymized attribution.'
);
ALTER TABLE public.profile_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users and admins view deletion records" ON public.profile_deletion_requests;
CREATE POLICY "Users and admins view deletion records"
  ON public.profile_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));

CREATE OR REPLACE FUNCTION public.vacp_anonymize_own_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  INSERT INTO public.profile_deletion_requests (user_id, completed_at, status)
  VALUES (v_user_id, now(), 'completed');
  PERFORM set_config('vacp.profile_lifecycle', 'anonymize', true);
  UPDATE public.profiles
  SET full_name = 'Deleted member',
      email = '',
      avatar_url = '',
      phone = '',
      location = '',
      bio = '',
      title = '',
      department = '',
      department_id = NULL,
      supervisor_id = NULL,
      is_active = false,
      role = 'deleted',
      profile_deleted_at = now(),
      updated_at = now()
  WHERE id = v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.vacp_heartbeat_activity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacp_heartbeat_activity(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.vacp_anonymize_own_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacp_anonymize_own_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.vacp_notify_daily_entry_reviewers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject public.profiles%ROWTYPE;
  v_user_name text;
BEGIN
  IF NEW.status <> 'pending' OR (TG_OP = 'UPDATE' AND OLD.status = 'pending') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_subject FROM public.profiles WHERE id = NEW.user_id;
  IF v_subject.is_md THEN
    RETURN NEW;
  END IF;
  v_user_name := coalesce(nullif(v_subject.full_name, ''), 'A team member');

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT reviewer_id,
         'Daily KPI report needs review',
         v_user_name || ' submitted a daily KPI report for ' || NEW.entry_date::text || '.',
         'warning',
         '/daily-approvals'
  FROM (
    SELECT v_subject.supervisor_id AS reviewer_id
    UNION
    SELECT d.lead_user_id FROM public.departments d WHERE d.id = v_subject.department_id
    UNION
    SELECT p.id FROM public.profiles p WHERE p.role IN ('admin', 'director')
  ) reviewers
  WHERE reviewer_id IS NOT NULL AND reviewer_id <> NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vacp_daily_entry_review_notification ON public.daily_entries;
CREATE TRIGGER vacp_daily_entry_review_notification
  AFTER INSERT OR UPDATE OF status ON public.daily_entries
  FOR EACH ROW EXECUTE FUNCTION public.vacp_notify_daily_entry_reviewers();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'developer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
