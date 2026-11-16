DO $$
BEGIN
  IF to_regclass('public.project_integrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Project integrations viewable by authenticated users" ON public.project_integrations';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/director/manager can insert project integrations" ON public.project_integrations';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/director/manager can update project integrations" ON public.project_integrations';
    EXECUTE 'DROP POLICY IF EXISTS "Admin/director/manager can delete project integrations" ON public.project_integrations';
    EXECUTE 'DROP POLICY IF EXISTS "Legacy project integrations are inaccessible" ON public.project_integrations';
    EXECUTE 'CREATE POLICY "Legacy project integrations are inaccessible" ON public.project_integrations AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)';
  END IF;
END;
$$;
