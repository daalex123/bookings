-- Additional services (add-ons) share appointment timing with a primary service.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS parent_service_id uuid REFERENCES public.services (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS services_parent_service_id_idx
  ON public.services (parent_service_id);

CREATE TABLE IF NOT EXISTS public.appointment_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, service_id)
);

CREATE INDEX IF NOT EXISTS appointment_addons_appointment_id_idx
  ON public.appointment_addons (appointment_id);

ALTER TABLE public.appointment_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_addons_select_via_appointment"
  ON public.appointment_addons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.id = appointment_addons.appointment_id
        AND (
          a.customer_id = auth.uid()
          OR private.is_business_member(a.business_id)
        )
    )
  );

CREATE OR REPLACE FUNCTION public.get_public_business(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  result json;
BEGIN
  v_business_id := private.resolve_business_id(p_token);

  IF v_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'business', (
      SELECT json_build_object(
        'id', b.id,
        'name', b.name,
        'slug', b.slug,
        'description', b.description,
        'tagline', b.tagline,
        'timezone', b.timezone,
        'currency', b.currency,
        'logo_url', b.logo_url,
        'cover_image_url', b.cover_image_url,
        'brand_color', b.brand_color,
        'booking_token', b.booking_token
      )
      FROM public.businesses b WHERE b.id = v_business_id
    ),
    'services', COALESCE((
      SELECT json_agg(json_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'duration_minutes', s.duration_minutes,
        'slot_interval_minutes', s.slot_interval_minutes,
        'price', s.price,
        'image_url', s.image_url
      ) ORDER BY s.name)
      FROM public.services s
      WHERE s.business_id = v_business_id
        AND s.is_active = true
        AND s.parent_service_id IS NULL
    ), '[]'::json),
    'addons', COALESCE((
      SELECT json_agg(json_build_object(
        'id', s.id,
        'parent_service_id', s.parent_service_id,
        'name', s.name,
        'description', s.description,
        'price', s.price,
        'image_url', s.image_url
      ) ORDER BY s.name)
      FROM public.services s
      WHERE s.business_id = v_business_id
        AND s.is_active = true
        AND s.parent_service_id IS NOT NULL
    ), '[]'::json),
    'hours', COALESCE((
      SELECT json_agg(json_build_object(
        'day_of_week', h.day_of_week,
        'open_time', h.open_time,
        'close_time', h.close_time,
        'is_closed', h.is_closed
      ) ORDER BY h.day_of_week)
      FROM public.business_hours h
      WHERE h.business_id = v_business_id
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_ref text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_notes text DEFAULT NULL,
  p_addon_service_ids uuid[] DEFAULT '{}'
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
  v_addon_id uuid;
  v_addon_price numeric(10, 2);
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  v_business_id := private.resolve_business_id(p_ref);
  IF v_business_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid booking link');
  END IF;

  SELECT s.duration_minutes INTO v_duration_minutes
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
    status
  ) VALUES (
    v_business_id,
    p_service_id,
    v_customer_id,
    p_start_at,
    p_end_at,
    NULLIF(TRIM(p_notes), ''),
    'pending'
  )
  RETURNING id INTO v_appointment_id;

  IF p_addon_service_ids IS NOT NULL THEN
    FOREACH v_addon_id IN ARRAY p_addon_service_ids
    LOOP
      SELECT s.price INTO v_addon_price
      FROM public.services s
      WHERE s.id = v_addon_id;

      INSERT INTO public.appointment_addons (appointment_id, service_id, price)
      VALUES (v_appointment_id, v_addon_id, v_addon_price);
    END LOOP;
  END IF;

  RETURN json_build_object('success', true, 'id', v_appointment_id);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'This time slot is no longer available');
END;
$$;
