-- Customers cannot SELECT services directly (member-only RLS), so appointment
-- inserts fail the WITH CHECK subquery. Book via SECURITY DEFINER RPC instead.

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
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  v_business_id := private.resolve_business_id(p_ref);
  IF v_business_id IS NULL THEN
    RETURN json_build_object('error', 'Invalid booking link');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.business_id = v_business_id
      AND s.is_active = true
  ) THEN
    RETURN json_build_object('error', 'Service not found');
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN json_build_object('error', 'Invalid time range');
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

GRANT EXECUTE ON FUNCTION public.create_public_appointment TO authenticated;
