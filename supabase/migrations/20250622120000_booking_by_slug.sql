-- Resolve public booking by secure token OR friendly slug

CREATE OR REPLACE FUNCTION private.resolve_business_id(p_ref text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.businesses
  WHERE booking_token = p_ref OR slug = p_ref
  LIMIT 1;
$$;

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
      AND a.start_at >= p_start
      AND a.start_at <= p_end
      AND a.status <> 'cancelled'
  ), '[]'::json);
END;
$$;
