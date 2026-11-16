CREATE OR REPLACE FUNCTION public.vacp_is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    profile.role IN ('admin', 'director')
    OR (
      profile.role = 'manager'
      AND (
        lower(trim(coalesce(profile.department, ''))) IN ('executive', 'executive department')
        OR EXISTS (
          SELECT 1
          FROM public.departments department
          WHERE department.id = profile.department_id
            AND lower(trim(department.name)) IN ('executive', 'executive department')
        )
      )
    ),
    false
  )
  FROM public.profiles profile
  WHERE profile.id = p_user_id
$$;

REVOKE ALL ON FUNCTION public.vacp_is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacp_is_admin(uuid) TO authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
    'departments',
    'partner_department_access',
    'drive_folders',
    'drive_documents',
    'drive_document_comments',
    'platform_accounts',
    'user_activity_sessions',
    'profile_deletion_requests',
    'daily_kpis',
    'daily_entries',
    'daily_entry_items',
    'daily_entry_reviews',
    'objectives',
    'key_results',
    'audit_logs'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        'Organization administrators have full access',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.vacp_is_admin()) WITH CHECK (public.vacp_is_admin())',
        'Organization administrators have full access',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Objectives visible to organization scope" ON public.objectives;
DROP POLICY IF EXISTS "Authorized users create objectives" ON public.objectives;
DROP POLICY IF EXISTS "Authorized users update objectives" ON public.objectives;
DROP POLICY IF EXISTS "Authorized users delete objectives" ON public.objectives;

CREATE POLICY "Objectives visible to organization scope"
  ON public.objectives FOR SELECT TO authenticated
  USING (
    public.vacp_is_admin()
    OR public.vacp_user_role() = 'ceo'
    OR (level = 'company' AND public.vacp_user_role() <> 'partner')
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role <> 'partner'
        AND level IN ('department', 'team')
        AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objectives.department, '')))
    )
    OR EXISTS (
      SELECT 1
      FROM public.partner_department_access access
      JOIN public.departments department ON department.id = access.department_id
      WHERE access.partner_id = auth.uid()
        AND lower(trim(department.name)) = lower(trim(coalesce(objectives.department, '')))
    )
  );

CREATE POLICY "Authorized users create objectives"
  ON public.objectives FOR INSERT TO authenticated
  WITH CHECK (
    public.vacp_is_admin()
    OR public.vacp_user_role() = 'ceo'
    OR (
      level = 'individual'
      AND coalesce(owner_id, auth.uid()) = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
        AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objectives.department, '')))
        AND level IN ('department', 'team')
    )
  );

CREATE POLICY "Authorized users update objectives"
  ON public.objectives FOR UPDATE TO authenticated
  USING (
    public.vacp_is_admin()
    OR public.vacp_user_role() = 'ceo'
    OR (owner_id = auth.uid() AND level = 'individual')
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
        AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objectives.department, '')))
        AND level IN ('department', 'team')
    )
  )
  WITH CHECK (
    public.vacp_is_admin()
    OR public.vacp_user_role() = 'ceo'
    OR (owner_id = auth.uid() AND level = 'individual')
    OR EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid()
        AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
        AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objectives.department, '')))
        AND level IN ('department', 'team')
    )
  );

CREATE POLICY "Authorized users delete objectives"
  ON public.objectives FOR DELETE TO authenticated
  USING (public.vacp_is_admin());

DROP POLICY IF EXISTS "Authorized users create key results" ON public.key_results;
DROP POLICY IF EXISTS "Authorized users update key results" ON public.key_results;

CREATE POLICY "Authorized users create key results"
  ON public.key_results FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.objectives objective
      WHERE objective.id = key_results.objective_id
        AND (
          public.vacp_is_admin()
          OR public.vacp_user_role() = 'ceo'
          OR objective.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles viewer
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
              AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objective.department, '')))
              AND objective.level IN ('department', 'team')
          )
        )
    )
  );

CREATE POLICY "Authorized users update key results"
  ON public.key_results FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.objectives objective
      WHERE objective.id = key_results.objective_id
        AND (
          public.vacp_is_admin()
          OR public.vacp_user_role() = 'ceo'
          OR objective.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles viewer
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
              AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objective.department, '')))
              AND objective.level IN ('department', 'team')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.objectives objective
      WHERE objective.id = key_results.objective_id
        AND (
          public.vacp_is_admin()
          OR public.vacp_user_role() = 'ceo'
          OR objective.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles viewer
            WHERE viewer.id = auth.uid()
              AND viewer.role IN ('manager', 'marketing_manager', 'hr', 'legal_counsel')
              AND lower(trim(coalesce(viewer.department, ''))) = lower(trim(coalesce(objective.department, '')))
              AND objective.level IN ('department', 'team')
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.vacp_protect_profile_authority_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_manage boolean := public.vacp_is_admin();
BEGIN
  IF NOT v_can_manage AND current_user NOT IN ('postgres', 'service_role') AND (
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.department IS DISTINCT FROM OLD.department
    OR NEW.department_id IS DISTINCT FROM OLD.department_id
    OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id
    OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
    OR NEW.is_md IS DISTINCT FROM OLD.is_md
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION 'Only administrators can change access or employment fields';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vacp_review_daily_entry(
  p_entry_id uuid,
  p_decision text,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reviewer_id uuid := auth.uid();
  v_entry public.daily_entries%ROWTYPE;
  v_reviewer public.profiles%ROWTYPE;
  v_subject public.profiles%ROWTYPE;
BEGIN
  IF v_reviewer_id IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review request';
  END IF;
  IF p_decision = 'rejected' AND length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO v_entry
  FROM public.daily_entries
  WHERE id = p_entry_id
  FOR UPDATE;
  IF NOT FOUND OR v_entry.status <> 'pending' THEN
    RAISE EXCEPTION 'Entry is not awaiting approval';
  END IF;

  SELECT * INTO v_reviewer FROM public.profiles WHERE id = v_reviewer_id AND is_active = true;
  SELECT * INTO v_subject FROM public.profiles WHERE id = v_entry.user_id;
  IF v_entry.user_id = v_reviewer_id OR NOT (
    public.vacp_is_admin(v_reviewer_id)
    OR v_subject.supervisor_id = v_reviewer_id
    OR (v_reviewer.role = 'manager' AND v_reviewer.department <> '' AND v_reviewer.department = v_subject.department)
  ) THEN
    RAISE EXCEPTION 'You are not authorized to review this entry';
  END IF;

  UPDATE public.daily_entries
  SET status = p_decision,
      approved_by = CASE WHEN p_decision = 'approved' THEN v_reviewer_id ELSE NULL END,
      approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE NULL END,
      rejection_reason = CASE WHEN p_decision = 'rejected' THEN left(trim(p_reason), 500) ELSE NULL END,
      updated_at = now()
  WHERE id = p_entry_id;

  INSERT INTO public.daily_entry_reviews (entry_id, reviewer_id, decision, reason)
  VALUES (p_entry_id, v_reviewer_id, p_decision, CASE WHEN p_decision = 'rejected' THEN left(trim(p_reason), 500) ELSE '' END);
END;
$$;

REVOKE ALL ON FUNCTION public.vacp_review_daily_entry(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacp_review_daily_entry(uuid, text, text) TO authenticated;

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
    SELECT p.id FROM public.profiles p WHERE public.vacp_is_admin(p.id)
  ) reviewers
  WHERE reviewer_id IS NOT NULL AND reviewer_id <> NEW.user_id;
  RETURN NEW;
END;
$$;
