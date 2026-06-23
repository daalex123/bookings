-- Secure business isolation + unguessable booking links

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_token text;

UPDATE public.businesses
SET booking_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE booking_token IS NULL;

ALTER TABLE public.businesses
  ALTER COLUMN booking_token SET NOT NULL;

ALTER TABLE public.businesses
  ALTER COLUMN booking_token SET DEFAULT (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  );

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_booking_token_key UNIQUE (booking_token);

CREATE INDEX IF NOT EXISTS businesses_booking_token_idx ON public.businesses (booking_token);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "businesses_select_all" ON public.businesses;
DROP POLICY IF EXISTS "business_hours_select_all" ON public.business_hours;
DROP POLICY IF EXISTS "services_select_active_or_member" ON public.services;
DROP POLICY IF EXISTS "appointments_insert_customer" ON public.appointments;

-- Businesses: only members can read via API
CREATE POLICY "businesses_select_member"
  ON public.businesses FOR SELECT TO authenticated
  USING (private.is_business_member(id));

CREATE POLICY "businesses_select_customer"
  ON public.businesses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.business_id = businesses.id AND a.customer_id = auth.uid()
    )
  );

-- Services & hours: only business members (public access via RPC)
CREATE POLICY "services_select_member"
  ON public.services FOR SELECT TO authenticated
  USING (private.is_business_member(business_id));

CREATE POLICY "business_hours_select_member"
  ON public.business_hours FOR SELECT TO authenticated
  USING (private.is_business_member(business_id));

-- Stricter appointment insert: service must belong to business and be active
CREATE POLICY "appointments_insert_customer"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id
        AND s.business_id = appointments.business_id
        AND s.is_active = true
    )
  );

-- Public booking page data (token-scoped only)
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
  SELECT id INTO v_business_id
  FROM public.businesses
  WHERE booking_token = p_token;

  IF v_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'business', (
      SELECT json_build_object(
        'id', b.id,
        'name', b.name,
        'description', b.description,
        'timezone', b.timezone,
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
        'price', s.price
      ) ORDER BY s.name)
      FROM public.services s
      WHERE s.business_id = v_business_id AND s.is_active = true
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

REVOKE ALL ON FUNCTION public.get_public_business(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_business(text) TO anon, authenticated;

-- Regenerate booking link (owners/admins only)
CREATE OR REPLACE FUNCTION public.regenerate_booking_token(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token text;
BEGIN
  IF NOT private.is_business_admin(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to regenerate booking link';
  END IF;

  new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.businesses
  SET booking_token = new_token, updated_at = now()
  WHERE id = p_business_id;

  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_booking_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_booking_token(uuid) TO authenticated;

-- Booked slots for availability (no customer PII, token-scoped)
CREATE OR REPLACE FUNCTION public.get_public_booked_slots(
  p_token text,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'start_at', a.start_at,
      'end_at', a.end_at,
      'status', a.status
    ))
    FROM public.appointments a
    INNER JOIN public.businesses b ON b.id = a.business_id
    WHERE b.booking_token = p_token
      AND a.start_at >= p_start
      AND a.start_at <= p_end
      AND a.status <> 'cancelled'
  ), '[]'::json);
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_booked_slots(text, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(text, timestamptz, timestamptz) TO anon, authenticated;

-- Revoke direct RPC access to profile trigger function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
