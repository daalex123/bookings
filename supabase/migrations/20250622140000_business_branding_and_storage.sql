-- Business branding, currency, service images, storage, and booking hardening

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'LKR',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS brand_color text NOT NULL DEFAULT '#f5c518',
  ADD COLUMN IF NOT EXISTS tagline text;

ALTER TABLE public.businesses
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS image_url text;

-- Existing rows: keep UTC unless unset; new businesses get Asia/Kolkata via default
UPDATE public.businesses SET currency = 'LKR' WHERE currency IS NULL;

-- Storage bucket for logos, covers, and service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "business_assets_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'business-assets');

CREATE POLICY "business_assets_member_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "business_assets_member_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
    )
  );

CREATE POLICY "business_assets_member_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (storage.foldername(name))[1] IN (
      SELECT bm.business_id::text
      FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
    )
  );

-- Business creation defaults: LKR + Asia/Kolkata (IST)
CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_timezone text DEFAULT 'Asia/Kolkata',
  p_currency text DEFAULT 'LKR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_day smallint;
  v_booking_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_booking_token :=
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.businesses (
    name, slug, description, timezone, currency, booking_token
  )
  VALUES (
    p_name,
    p_slug,
    p_description,
    COALESCE(NULLIF(TRIM(p_timezone), ''), 'Asia/Kolkata'),
    COALESCE(NULLIF(TRIM(p_currency), ''), 'LKR'),
    v_booking_token
  )
  RETURNING id INTO v_business_id;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (v_business_id, auth.uid(), 'owner');

  FOR v_day IN 0..6 LOOP
    INSERT INTO public.business_hours (
      business_id, day_of_week, open_time, close_time, is_closed
    ) VALUES (
      v_business_id,
      v_day,
      '09:00:00',
      '17:00:00',
      v_day IN (0, 6)
    );
  END LOOP;

  RETURN v_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, text, text, text) TO authenticated;

DROP FUNCTION IF EXISTS public.create_business_with_owner(text, text, text, text);

-- Public business payload includes branding + currency
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
        'price', s.price,
        'image_url', s.image_url
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

-- Return appointments overlapping the window (fixes cross-midnight / long slots)
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
DECLARE
  v_business_id uuid;
BEGIN
  v_business_id := private.resolve_business_id(p_token);

  IF v_business_id IS NULL THEN
    RETURN '[]'::json;
  END IF;

  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'start_at', a.start_at,
      'end_at', a.end_at,
      'status', a.status
    ))
    FROM public.appointments a
    WHERE a.business_id = v_business_id
      AND a.status <> 'cancelled'
      AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start, p_end, '[)')
  ), '[]'::json);
END;
$$;

-- Harden booking: validate duration, hours, and explicit overlap check
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  p_ref text,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_notes text DEFAULT NULL
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
  v_timezone text;
  v_local_start timestamp;
  v_local_end timestamp;
  v_day_of_week smallint;
  v_hours record;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  v_business_id := private.resolve_business_id(p_ref);
  IF v_business_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid booking link');
  END IF;

  SELECT s.duration_minutes, b.timezone
  INTO v_duration_minutes, v_timezone
  FROM public.services s
  JOIN public.businesses b ON b.id = s.business_id
  WHERE s.id = p_service_id
    AND s.business_id = v_business_id
    AND s.is_active = true;

  IF v_duration_minutes IS NULL THEN
    RETURN json_build_object('error', 'Service not found');
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN json_build_object('error', 'Invalid time range');
  END IF;

  IF p_end_at - p_start_at <> make_interval(mins => v_duration_minutes) THEN
    RETURN json_build_object('error', 'Appointment duration does not match service');
  END IF;

  IF p_start_at < now() THEN
    RETURN json_build_object('error', 'Cannot book a time in the past');
  END IF;

  v_local_start := p_start_at AT TIME ZONE COALESCE(NULLIF(TRIM(v_timezone), ''), 'Asia/Kolkata');
  v_local_end := p_end_at AT TIME ZONE COALESCE(NULLIF(TRIM(v_timezone), ''), 'Asia/Kolkata');
  v_day_of_week := EXTRACT(DOW FROM v_local_start)::smallint;

  SELECT h.open_time, h.close_time, h.is_closed
  INTO v_hours
  FROM public.business_hours h
  WHERE h.business_id = v_business_id
    AND h.day_of_week = v_day_of_week;

  IF v_hours IS NULL OR v_hours.is_closed THEN
    RETURN json_build_object('error', 'Business is closed on this day');
  END IF;

  IF v_local_start::time < v_hours.open_time
     OR v_local_end::time > v_hours.close_time THEN
    RETURN json_build_object('error', 'Selected time is outside business hours');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.business_id = v_business_id
      AND a.status NOT IN ('cancelled')
      AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) THEN
    RETURN json_build_object('error', 'This time slot is no longer available');
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

  RETURN json_build_object('success', true, 'id', v_appointment_id);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'This time slot is no longer available');
END;
$$;
