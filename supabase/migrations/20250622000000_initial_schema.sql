-- Book Now: initial schema (apply via Supabase Dashboard SQL or `supabase db push`)

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.business_role AS ENUM ('owner', 'admin', 'staff');
CREATE TYPE public.appointment_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

-- Private schema for RLS helpers (functions created after tables)
CREATE SCHEMA IF NOT EXISTS private;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Businesses
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX businesses_slug_idx ON public.businesses (slug);

CREATE TRIGGER businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Business members
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.business_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE INDEX business_members_user_id_idx ON public.business_members (user_id);
CREATE INDEX business_members_business_id_idx ON public.business_members (business_id);

CREATE TRIGGER business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX services_business_id_idx ON public.services (business_id);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Business hours
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, day_of_week),
  CHECK (is_closed OR open_time < close_time)
);

CREATE INDEX business_hours_business_id_idx ON public.business_hours (business_id);

CREATE TRIGGER business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Appointments
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE INDEX appointments_business_start_idx ON public.appointments (business_id, start_at);
CREATE INDEX appointments_customer_id_idx ON public.appointments (customer_id);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    business_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled'));

-- Private helpers (after all tables exist)
CREATE OR REPLACE FUNCTION private.is_business_member(
  p_business_id uuid,
  p_roles public.business_role[] DEFAULT ARRAY['owner', 'admin', 'staff']::public.business_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = auth.uid()
      AND bm.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_business_admin(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_business_member(
    p_business_id,
    ARRAY['owner', 'admin']::public.business_role[]
  );
$$;

CREATE OR REPLACE FUNCTION private.customer_booked_with_business(p_business_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.business_id = p_business_id AND a.customer_id = p_user_id
  );
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_select_business_customers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
        AND bm.role IN ('owner', 'admin')
        AND private.customer_booked_with_business(bm.business_id, profiles.id)
    )
  );

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Businesses
CREATE POLICY "businesses_select_all"
  ON public.businesses FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "businesses_insert_authenticated"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "businesses_update_admin"
  ON public.businesses FOR UPDATE TO authenticated
  USING (private.is_business_admin(id))
  WITH CHECK (private.is_business_admin(id));

CREATE POLICY "businesses_delete_owner"
  ON public.businesses FOR DELETE TO authenticated
  USING (private.is_business_member(id, ARRAY['owner']::public.business_role[]));

-- Business members
CREATE POLICY "business_members_select_same_business"
  ON public.business_members FOR SELECT TO authenticated
  USING (private.is_business_member(business_id));

CREATE POLICY "business_members_insert_owner_admin"
  ON public.business_members FOR INSERT TO authenticated
  WITH CHECK (
    private.is_business_admin(business_id)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = business_members.business_id
      )
    )
  );

CREATE POLICY "business_members_update_admin"
  ON public.business_members FOR UPDATE TO authenticated
  USING (private.is_business_admin(business_id))
  WITH CHECK (private.is_business_admin(business_id));

CREATE POLICY "business_members_delete_admin"
  ON public.business_members FOR DELETE TO authenticated
  USING (private.is_business_admin(business_id));

-- Services
CREATE POLICY "services_select_active_or_member"
  ON public.services FOR SELECT TO anon, authenticated
  USING (is_active OR private.is_business_member(business_id));

CREATE POLICY "services_insert_member"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "services_update_member"
  ON public.services FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE TO authenticated
  USING (private.is_business_admin(business_id));

-- Business hours
CREATE POLICY "business_hours_select_all"
  ON public.business_hours FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "business_hours_insert_admin"
  ON public.business_hours FOR INSERT TO authenticated
  WITH CHECK (private.is_business_admin(business_id));

CREATE POLICY "business_hours_update_admin"
  ON public.business_hours FOR UPDATE TO authenticated
  USING (private.is_business_admin(business_id))
  WITH CHECK (private.is_business_admin(business_id));

CREATE POLICY "business_hours_delete_admin"
  ON public.business_hours FOR DELETE TO authenticated
  USING (private.is_business_admin(business_id));

-- Appointments
CREATE POLICY "appointments_select_own_or_member"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR private.is_business_member(business_id)
  );

CREATE POLICY "appointments_insert_customer"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "appointments_update_own_or_member"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR private.is_business_member(business_id)
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR private.is_business_member(business_id)
  );
