-- Admin appointment CRUD (business members only)

CREATE OR REPLACE FUNCTION private.resolve_customer_for_admin(
  p_customer_id uuid,
  p_customer_email text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_email text;
BEGIN
  IF p_customer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_customer_id) THEN
      RAISE EXCEPTION 'Customer not found';
    END IF;
    RETURN p_customer_id;
  END IF;

  v_email := lower(trim(p_customer_email));
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Customer email is required';
  END IF;

  SELECT u.id INTO v_customer_id
  FROM auth.users u
  WHERE lower(u.email) = v_email;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No account found for this email. The customer must register first.';
  END IF;

  RETURN v_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_customer_directory(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name,
    u.email::text,
    p.phone
  FROM public.appointments a
  JOIN public.profiles p ON p.id = a.customer_id
  JOIN auth.users u ON u.id = p.id
  WHERE a.business_id = p_business_id
  ORDER BY p.full_name NULLS LAST, u.email;
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
BEGIN
  IF NOT private.is_business_member(p_business_id) THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  v_customer_id := private.resolve_customer_for_admin(p_customer_id, p_customer_email);

  SELECT s.duration_minutes INTO v_duration_minutes
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
    status
  ) VALUES (
    p_business_id,
    p_service_id,
    v_customer_id,
    p_start_at,
    p_end_at,
    NULLIF(TRIM(p_notes), ''),
    p_status
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

CREATE OR REPLACE FUNCTION public.admin_update_appointment(
  p_business_id uuid,
  p_appointment_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_notes text DEFAULT NULL,
  p_status public.appointment_status DEFAULT 'confirmed'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration_minutes integer;
BEGIN
  IF NOT private.is_business_member(p_business_id) THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id AND a.business_id = p_business_id
  ) THEN
    RETURN json_build_object('error', 'Appointment not found');
  END IF;

  SELECT s.duration_minutes INTO v_duration_minutes
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
      AND a.id <> p_appointment_id
      AND a.status NOT IN ('cancelled')
      AND tstzrange(a.start_at, a.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)')
  ) THEN
    RETURN json_build_object('error', 'This time slot overlaps another appointment');
  END IF;

  UPDATE public.appointments
  SET
    service_id = p_service_id,
    start_at = p_start_at,
    end_at = p_end_at,
    notes = NULLIF(TRIM(p_notes), ''),
    status = p_status
  WHERE id = p_appointment_id
    AND business_id = p_business_id;

  RETURN json_build_object('success', true, 'id', p_appointment_id);
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN json_build_object('error', 'This time slot overlaps another appointment');
  WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_appointment(
  p_business_id uuid,
  p_appointment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_business_member(p_business_id) THEN
    RETURN json_build_object('error', 'Not authorized');
  END IF;

  DELETE FROM public.appointments
  WHERE id = p_appointment_id
    AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Appointment not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_customer_directory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_appointment(uuid, uuid, timestamptz, timestamptz, uuid, text, text, public.appointment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_appointment(uuid, uuid, uuid, timestamptz, timestamptz, text, public.appointment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_appointment(uuid, uuid) TO authenticated;
