-- Update get_public_business to include staff names per service
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
        'background_color', b.background_color,
        'admin_background_color', b.admin_background_color,
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
        'show_price', s.show_price,
        'image_url', s.image_url,
        'staff_names', COALESCE((
          SELECT json_agg(COALESCE(bm.staff_name, p.full_name))
          FROM public.staff_services ss
          JOIN public.business_members bm ON bm.id = ss.member_id
          LEFT JOIN public.profiles p ON p.id = bm.user_id
          WHERE ss.service_id = s.id
        ), '[]'::json)
      ) ORDER BY s.sort_order, s.name)
      FROM public.services s
      WHERE s.business_id = v_business_id
        AND s.is_active = true
        AND s.parent_service_id IS NULL
    ), '[]'::json),
    'addons', COALESCE((
      SELECT json_agg(addon ORDER BY addon.sort_order, addon.name)
      FROM (
        SELECT
          s.id,
          s.parent_service_id,
          s.name,
          s.description,
          s.price,
          s.show_price,
          s.image_url,
          s.sort_order,
          false AS is_linked
        FROM public.services s
        WHERE s.business_id = v_business_id
          AND s.is_active = true
          AND s.parent_service_id IS NOT NULL
        UNION ALL
        SELECT
          child.id,
          l.parent_service_id,
          child.name,
          child.description,
          child.price,
          child.show_price,
          child.image_url,
          l.sort_order,
          true AS is_linked
        FROM public.service_extra_links l
        JOIN public.services child ON child.id = l.child_service_id
        WHERE child.business_id = v_business_id
          AND child.is_active = true
          AND child.parent_service_id IS NULL
      ) AS addon
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
