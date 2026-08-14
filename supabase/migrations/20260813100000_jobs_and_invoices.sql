-- Jobs lifecycle + offline invoicing (dynamic admin composer)
-- Appointment primary service price snapshot (mirrors appointment_addons)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.job_status AS ENUM (
  'queued',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE public.job_event_visibility AS ENUM ('public', 'internal');

CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'paid',
  'void'
);

CREATE TYPE public.invoice_payment_method AS ENUM (
  'cash',
  'card',
  'bank_transfer',
  'other'
);

-- ---------------------------------------------------------------------------
-- Appointment price snapshots
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS service_cost_price numeric(10, 2);

UPDATE public.appointments a
SET
  service_price = COALESCE(a.service_price, s.price, 0),
  service_cost_price = COALESCE(a.service_cost_price, s.cost_price, 0)
FROM public.services s
WHERE s.id = a.service_id
  AND (a.service_price IS NULL OR a.service_cost_price IS NULL);

ALTER TABLE public.appointments
  ALTER COLUMN service_price SET DEFAULT 0,
  ALTER COLUMN service_cost_price SET DEFAULT 0;

ALTER TABLE public.appointments
  ALTER COLUMN service_price SET NOT NULL,
  ALTER COLUMN service_cost_price SET NOT NULL;

COMMENT ON COLUMN public.appointments.service_price IS
  'Snapshot of primary service price at booking time.';
COMMENT ON COLUMN public.appointments.service_cost_price IS
  'Snapshot of primary service cost at booking time.';

-- ---------------------------------------------------------------------------
-- Business invoice sequence
-- ---------------------------------------------------------------------------
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS next_invoice_number integer NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.job_status NOT NULL DEFAULT 'queued',
  assigned_member_id uuid REFERENCES public.business_members (id) ON DELETE SET NULL,
  public_notes text,
  internal_notes text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_business_id_idx ON public.jobs (business_id);
CREATE INDEX jobs_customer_id_idx ON public.jobs (customer_id);
CREATE INDEX jobs_status_idx ON public.jobs (business_id, status);

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Job events (immutable timeline)
-- ---------------------------------------------------------------------------
CREATE TABLE public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  message text NOT NULL,
  visibility public.job_event_visibility NOT NULL DEFAULT 'public',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_events_job_id_idx ON public.job_events (job_id, created_at);
CREATE INDEX job_events_business_id_idx ON public.job_events (business_id);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments (id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs (id) ON DELETE SET NULL,
  invoice_number text,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'LKR',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  notes text,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  payment_provider text,
  external_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_unique_per_business
    UNIQUE (business_id, invoice_number)
);

CREATE INDEX invoices_business_status_idx ON public.invoices (business_id, status);
CREATE INDEX invoices_customer_id_idx ON public.invoices (customer_id);
CREATE INDEX invoices_job_id_idx ON public.invoices (job_id);
CREATE INDEX invoices_appointment_id_idx ON public.invoices (appointment_id);

-- At most one non-void draft per job
CREATE UNIQUE INDEX invoices_one_draft_per_job
  ON public.invoices (job_id)
  WHERE job_id IS NOT NULL AND status = 'draft';

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  cost_price numeric(12, 2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoice_items_invoice_id_idx ON public.invoice_items (invoice_id);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  method public.invoice_payment_method NOT NULL DEFAULT 'cash',
  paid_at timestamptz NOT NULL DEFAULT now(),
  note text,
  recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoice_payments_invoice_id_idx ON public.invoice_payments (invoice_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Jobs
CREATE POLICY "jobs_select_member_or_customer"
  ON public.jobs FOR SELECT TO authenticated
  USING (
    private.is_business_member(business_id)
    OR customer_id = auth.uid()
  );

CREATE POLICY "jobs_insert_member"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "jobs_update_member"
  ON public.jobs FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "jobs_delete_member"
  ON public.jobs FOR DELETE TO authenticated
  USING (private.is_business_member(business_id));

-- Job events: customers only see public events
CREATE POLICY "job_events_select_member_or_public_customer"
  ON public.job_events FOR SELECT TO authenticated
  USING (
    private.is_business_member(business_id)
    OR (
      visibility = 'public'
      AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = job_events.job_id
          AND j.customer_id = auth.uid()
      )
    )
  );

CREATE POLICY "job_events_insert_member"
  ON public.job_events FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

-- Invoices
CREATE POLICY "invoices_select_member_or_customer"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    private.is_business_member(business_id)
    OR (
      customer_id = auth.uid()
      AND status IN ('issued', 'paid', 'void')
    )
  );

CREATE POLICY "invoices_insert_member"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "invoices_update_member"
  ON public.invoices FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "invoices_delete_member"
  ON public.invoices FOR DELETE TO authenticated
  USING (
    private.is_business_member(business_id)
    AND status = 'draft'
  );

-- Invoice items
CREATE POLICY "invoice_items_select"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND (
          private.is_business_member(i.business_id)
          OR (
            i.customer_id = auth.uid()
            AND i.status IN ('issued', 'paid', 'void')
          )
        )
    )
  );

CREATE POLICY "invoice_items_insert_member"
  ON public.invoice_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND private.is_business_member(i.business_id)
        AND i.status = 'draft'
    )
  );

CREATE POLICY "invoice_items_update_member"
  ON public.invoice_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND private.is_business_member(i.business_id)
        AND i.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND private.is_business_member(i.business_id)
        AND i.status = 'draft'
    )
  );

CREATE POLICY "invoice_items_delete_member"
  ON public.invoice_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id
        AND private.is_business_member(i.business_id)
        AND i.status = 'draft'
    )
  );

-- Invoice payments
CREATE POLICY "invoice_payments_select"
  ON public.invoice_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_payments.invoice_id
        AND (
          private.is_business_member(i.business_id)
          OR (
            i.customer_id = auth.uid()
            AND i.status IN ('issued', 'paid', 'void')
          )
        )
    )
  );

CREATE POLICY "invoice_payments_insert_member"
  ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_payments.invoice_id
        AND private.is_business_member(i.business_id)
        AND i.status IN ('issued', 'paid')
    )
  );

-- ---------------------------------------------------------------------------
-- Booking RPCs: snapshot primary service price (+ addon cost)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_ref text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_notes text DEFAULT NULL,
  p_addon_service_ids uuid[] DEFAULT '{}',
  p_custom_fields jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_customer_id uuid;
  v_appointment_id uuid;
  v_duration_minutes integer;
  v_service_price numeric(10, 2);
  v_service_cost_price numeric(10, 2);
  v_addon_id uuid;
  v_addon_price numeric(10, 2);
  v_addon_cost_price numeric(10, 2);
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  v_business_id := private.resolve_business_id(p_ref);
  IF v_business_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid booking link');
  END IF;

  SELECT s.duration_minutes, s.price, s.cost_price
  INTO v_duration_minutes, v_service_price, v_service_cost_price
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.business_id = v_business_id
    AND s.is_active = true
    AND s.parent_service_id IS NULL;

  IF v_duration_minutes IS NULL THEN
    RETURN json_build_object('error', 'Service not found');
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN json_build_object('error', 'Invalid time range');
  END IF;

  IF p_end_at - p_start_at <> make_interval(mins => v_duration_minutes) THEN
    RETURN json_build_object('error', 'Appointment duration must match the selected service');
  END IF;

  IF p_addon_service_ids IS NOT NULL AND array_length(p_addon_service_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM unnest(p_addon_service_ids) AS addon_id
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.services s
        WHERE s.id = addon_id
          AND s.business_id = v_business_id
          AND s.is_active = true
          AND s.parent_service_id = p_service_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.service_extra_links l
        JOIN public.services child ON child.id = l.child_service_id
        WHERE l.parent_service_id = p_service_id
          AND l.child_service_id = addon_id
          AND child.business_id = v_business_id
          AND child.is_active = true
      )
    ) THEN
      RETURN json_build_object('error', 'One or more additional services are invalid');
    END IF;
  END IF;

  INSERT INTO public.appointments (
    business_id,
    service_id,
    customer_id,
    start_at,
    end_at,
    notes,
    status,
    custom_fields,
    service_price,
    service_cost_price
  ) VALUES (
    v_business_id,
    p_service_id,
    v_customer_id,
    p_start_at,
    p_end_at,
    NULLIF(TRIM(p_notes), ''),
    'pending',
    COALESCE(p_custom_fields, '{}'::jsonb),
    COALESCE(v_service_price, 0),
    COALESCE(v_service_cost_price, 0)
  )
  RETURNING id INTO v_appointment_id;

  IF p_addon_service_ids IS NOT NULL THEN
    FOREACH v_addon_id IN ARRAY p_addon_service_ids
    LOOP
      SELECT s.price, s.cost_price
      INTO v_addon_price, v_addon_cost_price
      FROM public.services s
      WHERE s.id = v_addon_id;

      INSERT INTO public.appointment_addons (appointment_id, service_id, price, cost_price)
      VALUES (v_appointment_id, v_addon_id, COALESCE(v_addon_price, 0), COALESCE(v_addon_cost_price, 0));
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'id', v_appointment_id);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'This time slot is no longer available');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_customer_id uuid DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status public.appointment_status DEFAULT 'confirmed'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_appointment_id uuid;
  v_duration_minutes integer;
  v_service_price numeric(10, 2);
  v_service_cost_price numeric(10, 2);
BEGIN
  IF NOT private.is_business_member(p_business_id) THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  v_customer_id := private.resolve_customer_for_admin(p_customer_id, p_customer_email);

  SELECT s.duration_minutes, s.price, s.cost_price
  INTO v_duration_minutes, v_service_price, v_service_cost_price
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.business_id = p_business_id;

  IF v_duration_minutes IS NULL THEN
    RETURN json_build_object('error', 'Service not found');
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN json_build_object('error', 'Invalid time range');
  END IF;

  IF p_end_at - p_start_at <> make_interval(mins => v_duration_minutes) THEN
    RETURN json_build_object('error', 'Appointment duration must match the selected service');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.business_id = p_business_id
      AND a.status NOT IN ('cancelled')
      AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) THEN
    RETURN json_build_object('error', 'This time slot overlaps another appointment');
  END IF;

  INSERT INTO public.appointments (
    business_id,
    service_id,
    customer_id,
    start_at,
    end_at,
    notes,
    status,
    service_price,
    service_cost_price
  ) VALUES (
    p_business_id,
    p_service_id,
    v_customer_id,
    p_start_at,
    p_end_at,
    NULLIF(TRIM(p_notes), ''),
    p_status,
    COALESCE(v_service_price, 0),
    COALESCE(v_service_cost_price, 0)
  )
  RETURNING id INTO v_appointment_id;

  RETURN json_build_object('success', true, 'id', v_appointment_id);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'This time slot overlaps another appointment');
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Issue invoice number atomically
CREATE OR REPLACE FUNCTION public.issue_invoice_number(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_status public.invoice_status;
  v_existing text;
  v_next integer;
  v_number text;
  v_year text := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
BEGIN
  SELECT business_id, status, invoice_number
  INTO v_business_id, v_status, v_existing
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF NOT private.is_business_member(v_business_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be issued';
  END IF;

  UPDATE public.businesses
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = v_business_id
  RETURNING next_invoice_number - 1 INTO v_next;

  v_number := 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');

  UPDATE public.invoices
  SET
    invoice_number = v_number,
    status = 'issued',
    issued_at = COALESCE(issued_at, now())
  WHERE id = p_invoice_id;

  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_invoice_number(uuid) TO authenticated;
