DROP TABLE IF EXISTS public.project_integrations;

ALTER TABLE public.objectives
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

UPDATE public.objectives objective
SET department_id = department.id
FROM public.departments department
WHERE objective.department_id IS NULL
  AND lower(trim(coalesce(objective.department, ''))) = lower(trim(department.name));

CREATE INDEX IF NOT EXISTS objectives_department_id_idx ON public.objectives (department_id);

ALTER TABLE public.daily_kpis
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Operations',
  ADD COLUMN IF NOT EXISTS measurement_direction text NOT NULL DEFAULT 'higher',
  ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public.objectives(id) ON DELETE SET NULL;

ALTER TABLE public.daily_kpis
  DROP CONSTRAINT IF EXISTS daily_kpis_measurement_direction_check;
ALTER TABLE public.daily_kpis
  ADD CONSTRAINT daily_kpis_measurement_direction_check
  CHECK (measurement_direction IN ('higher', 'lower', 'binary'));

ALTER TABLE public.daily_entry_items
  ADD COLUMN IF NOT EXISTS measurement_direction text NOT NULL DEFAULT 'higher',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Operations',
  ADD COLUMN IF NOT EXISTS objective_id uuid,
  ADD COLUMN IF NOT EXISTS objective_title text;

ALTER TABLE public.daily_entry_items
  DROP CONSTRAINT IF EXISTS daily_entry_items_measurement_direction_check;
ALTER TABLE public.daily_entry_items
  ADD CONSTRAINT daily_entry_items_measurement_direction_check
  CHECK (measurement_direction IN ('higher', 'lower', 'binary'));

UPDATE public.daily_entry_items item
SET measurement_direction = kpi.measurement_direction,
    category = kpi.category,
    objective_id = kpi.objective_id,
    objective_title = objective.title
FROM public.daily_kpis kpi
LEFT JOIN public.objectives objective ON objective.id = kpi.objective_id
WHERE item.kpi_id = kpi.id;

CREATE OR REPLACE FUNCTION public.vacp_snapshot_daily_kpi_definition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT kpi.measurement_direction, kpi.category, kpi.objective_id, objective.title
  INTO NEW.measurement_direction, NEW.category, NEW.objective_id, NEW.objective_title
  FROM public.daily_kpis kpi
  LEFT JOIN public.objectives objective ON objective.id = kpi.objective_id
  WHERE kpi.id = NEW.kpi_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KPI definition not found';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vacp_snapshot_daily_kpi_definition ON public.daily_entry_items;
CREATE TRIGGER vacp_snapshot_daily_kpi_definition
  BEFORE INSERT ON public.daily_entry_items
  FOR EACH ROW EXECUTE FUNCTION public.vacp_snapshot_daily_kpi_definition();

DROP POLICY IF EXISTS "Objectives viewable by authenticated" ON public.objectives;
DROP POLICY IF EXISTS "Objectives insertable by authenticated" ON public.objectives;
DROP POLICY IF EXISTS "Objectives updatable by authenticated" ON public.objectives;
DROP POLICY IF EXISTS "Objectives deletable by managers" ON public.objectives;

CREATE POLICY "Objectives visible to organization scope"
  ON public.objectives FOR SELECT TO authenticated
  USING (
    public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
    public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
    public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
    public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
  USING (public.vacp_user_role() IN ('admin', 'director'));

DROP POLICY IF EXISTS "Key results viewable by authenticated" ON public.key_results;
DROP POLICY IF EXISTS "Key results insertable by authenticated" ON public.key_results;
DROP POLICY IF EXISTS "Key results updatable by authenticated" ON public.key_results;
DROP POLICY IF EXISTS "Key results deletable by managers" ON public.key_results;

CREATE POLICY "Key results visible with objective"
  ON public.key_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.objectives objective WHERE objective.id = key_results.objective_id));

CREATE POLICY "Authorized users create key results"
  ON public.key_results FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.objectives objective
      WHERE objective.id = key_results.objective_id
        AND (
          public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
          public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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
          public.vacp_user_role() IN ('admin', 'director', 'ceo', 'executive')
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

CREATE POLICY "Administrators delete key results"
  ON public.key_results FOR DELETE TO authenticated
  USING (public.vacp_user_role() IN ('admin', 'director'));
