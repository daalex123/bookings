-- Atomic business creation (avoids RLS chicken-and-egg on insert + select)

CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC'
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

  INSERT INTO public.businesses (name, slug, description, timezone, booking_token)
  VALUES (p_name, p_slug, p_description, COALESCE(p_timezone, 'UTC'), v_booking_token)
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

REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, text, text) TO authenticated;

-- Direct business INSERT no longer allowed (use RPC above)
DROP POLICY IF EXISTS "businesses_insert_authenticated" ON public.businesses;
