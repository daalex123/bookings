-- Update create_public_appointment to support custom fields
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
    custom_fields
  ) VALUES (
    v_business_id,
    p_service_id,
    v_customer_id,
    p_start_at,
    p_end_at,
    NULLIF(TRIM(p_notes), ''),
    'pending',
    COALESCE(p_custom_fields, '{}'::jsonb)
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
