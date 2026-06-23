-- Per-service booking start interval (gap between slot start times)

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slot_interval_minutes integer;

UPDATE public.services
SET slot_interval_minutes = duration_minutes
WHERE slot_interval_minutes IS NULL;

ALTER TABLE public.services
  ALTER COLUMN slot_interval_minutes SET NOT NULL,
  ALTER COLUMN slot_interval_minutes SET DEFAULT 30;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_slot_interval_minutes_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_slot_interval_minutes_check
  CHECK (slot_interval_minutes > 0 AND slot_interval_minutes <= 480);

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
