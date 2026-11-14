ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joining_date date,
  ADD COLUMN IF NOT EXISTS is_md boolean NOT NULL DEFAULT false;

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

  IF NOT v_can_manage AND (
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.department IS DISTINCT FROM OLD.department
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

DROP TRIGGER IF EXISTS vacp_protect_profile_authority_fields ON public.profiles;
CREATE TRIGGER vacp_protect_profile_authority_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.vacp_protect_profile_authority_fields();

CREATE TABLE IF NOT EXISTS public.daily_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  unit text NOT NULL DEFAULT 'count' CHECK (length(trim(unit)) BETWEEN 1 AND 32),
  target numeric(14, 2) NOT NULL DEFAULT 1 CHECK (target >= 0),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  proof_required boolean NOT NULL DEFAULT true,
  proof_type text NOT NULL DEFAULT 'URL',
  active_from date NOT NULL DEFAULT current_date,
  active_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (active_until IS NULL OR active_until >= active_from)
);

CREATE INDEX IF NOT EXISTS daily_kpis_user_active_idx
  ON public.daily_kpis (user_id, is_active, active_from, active_until);

CREATE TABLE IF NOT EXISTS public.daily_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS daily_entries_user_date_idx
  ON public.daily_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS daily_entries_status_date_idx
  ON public.daily_entries (status, entry_date DESC);

CREATE TABLE IF NOT EXISTS public.daily_entry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  kpi_id uuid NOT NULL REFERENCES public.daily_kpis(id) ON DELETE RESTRICT,
  kpi_title text NOT NULL,
  unit text NOT NULL,
  target_value numeric(14, 2) NOT NULL,
  proof_required boolean NOT NULL,
  proof_type text NOT NULL,
  number_value numeric(14, 2) CHECK (number_value IS NULL OR number_value >= 0),
  proof_url text,
  note varchar(140) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, kpi_id)
);

CREATE TABLE IF NOT EXISTS public.daily_entry_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entry_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Daily KPIs visible to owner and department" ON public.daily_kpis;
CREATE POLICY "Daily KPIs visible to owner and department"
  ON public.daily_kpis FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles target
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE target.id = daily_kpis.user_id
        AND (
          viewer.role IN ('admin', 'director')
          OR (viewer.department <> '' AND target.department = viewer.department)
        )
    )
  );

DROP POLICY IF EXISTS "MD roles manage daily KPIs" ON public.daily_kpis;
CREATE POLICY "MD roles manage daily KPIs"
  ON public.daily_kpis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'director')));

DROP POLICY IF EXISTS "Daily entries visible to owner and reviewers" ON public.daily_entries;
CREATE POLICY "Daily entries visible to owner and reviewers"
  ON public.daily_entries FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles subject
      JOIN public.profiles viewer ON viewer.id = auth.uid()
      WHERE subject.id = daily_entries.user_id
        AND (
          subject.supervisor_id = auth.uid()
          OR viewer.role IN ('admin', 'director')
          OR (viewer.role = 'manager' AND viewer.department <> '' AND viewer.department = subject.department)
        )
    )
  );

DROP POLICY IF EXISTS "Daily entry items visible with entry" ON public.daily_entry_items;
CREATE POLICY "Daily entry items visible with entry"
  ON public.daily_entry_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries entry
      WHERE entry.id = daily_entry_items.entry_id
        AND (
          entry.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles subject
            JOIN public.profiles viewer ON viewer.id = auth.uid()
            WHERE subject.id = entry.user_id
              AND (
                subject.supervisor_id = auth.uid()
                OR viewer.role IN ('admin', 'director')
                OR (viewer.role = 'manager' AND viewer.department <> '' AND viewer.department = subject.department)
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Daily entry reviews visible with entry" ON public.daily_entry_reviews;
CREATE POLICY "Daily entry reviews visible with entry"
  ON public.daily_entry_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.daily_entries entry WHERE entry.id = daily_entry_reviews.entry_id)
  );

CREATE OR REPLACE FUNCTION public.vacp_save_daily_entry(
  p_entry_date date,
  p_status text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_entry_id uuid;
  v_existing_status text;
  v_expected_count integer;
  v_item_count integer;
  v_distinct_count integer;
  v_is_md boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_status NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION 'Invalid entry status';
  END IF;
  IF p_entry_date > current_date THEN
    RAISE EXCEPTION 'Future entries cannot be submitted';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Entry items must be an array';
  END IF;

  SELECT is_md INTO v_is_md
  FROM public.profiles
  WHERE id = v_user_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active profile required';
  END IF;

  SELECT count(*) INTO v_expected_count
  FROM public.daily_kpis
  WHERE user_id = v_user_id
    AND is_active = true
    AND active_from <= p_entry_date
    AND (active_until IS NULL OR active_until >= p_entry_date);

  SELECT count(*), count(DISTINCT item.kpi_id)
  INTO v_item_count, v_distinct_count
  FROM jsonb_to_recordset(p_items) AS item(kpi_id uuid, value numeric, proof_url text, note text);

  IF v_item_count <> v_expected_count OR v_distinct_count <> v_expected_count THEN
    RAISE EXCEPTION 'Include exactly one entry for each assigned KPI';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(kpi_id uuid, value numeric, proof_url text, note text)
    LEFT JOIN public.daily_kpis kpi
      ON kpi.id = item.kpi_id
      AND kpi.user_id = v_user_id
      AND kpi.is_active = true
      AND kpi.active_from <= p_entry_date
      AND (kpi.active_until IS NULL OR kpi.active_until >= p_entry_date)
    WHERE kpi.id IS NULL
       OR (item.value IS NOT NULL AND item.value < 0)
       OR length(coalesce(item.note, '')) > 140
  ) THEN
    RAISE EXCEPTION 'One or more KPI values are invalid';
  END IF;
  IF p_status = 'pending' AND (
    v_expected_count = 0
    OR EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_items) AS item(kpi_id uuid, value numeric, proof_url text, note text)
      WHERE item.value IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_items) AS item(kpi_id uuid, value numeric, proof_url text, note text)
      JOIN public.daily_kpis kpi ON kpi.id = item.kpi_id
      WHERE kpi.proof_required = true
        AND coalesce(item.proof_url, '') !~* '^https?://[^[:space:]]+[.][^[:space:]]+'
    )
  ) THEN
    RAISE EXCEPTION 'Complete every KPI value and required proof before submitting';
  END IF;

  SELECT id, status INTO v_entry_id, v_existing_status
  FROM public.daily_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date
  FOR UPDATE;

  IF v_existing_status IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Submitted entries are locked';
  END IF;

  IF v_entry_id IS NULL THEN
    INSERT INTO public.daily_entries (user_id, entry_date, status)
    VALUES (v_user_id, p_entry_date, 'draft')
    RETURNING id INTO v_entry_id;
  END IF;

  DELETE FROM public.daily_entry_items WHERE entry_id = v_entry_id;
  INSERT INTO public.daily_entry_items (entry_id, kpi_id, kpi_title, unit, target_value, proof_required, proof_type, number_value, proof_url, note)
  SELECT v_entry_id, item.kpi_id, kpi.title, kpi.unit, kpi.target, kpi.proof_required, kpi.proof_type, item.value, nullif(item.proof_url, ''), coalesce(item.note, '')
  FROM jsonb_to_recordset(p_items) AS item(kpi_id uuid, value numeric, proof_url text, note text)
  JOIN public.daily_kpis kpi ON kpi.id = item.kpi_id;

  UPDATE public.daily_entries
  SET status = CASE WHEN p_status = 'pending' AND v_is_md THEN 'approved' ELSE p_status END,
      submitted_at = CASE WHEN p_status = 'pending' THEN now() ELSE NULL END,
      approved_by = NULL,
      approved_at = CASE WHEN p_status = 'pending' AND v_is_md THEN now() ELSE NULL END,
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = v_entry_id;

  RETURN v_entry_id;
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
    v_reviewer.role IN ('admin', 'director')
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

REVOKE ALL ON FUNCTION public.vacp_save_daily_entry(date, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vacp_review_daily_entry(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vacp_save_daily_entry(date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vacp_review_daily_entry(uuid, text, text) TO authenticated;
