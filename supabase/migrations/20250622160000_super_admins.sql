-- Platform super admins: full access to every business (dashboard + RLS)

CREATE TABLE public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins sa WHERE sa.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_super_admin(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin() TO authenticated;

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
  SELECT private.is_super_admin()
    OR EXISTS (
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
  SELECT private.is_super_admin()
    OR private.is_business_member(
      p_business_id,
      ARRAY['owner', 'admin']::public.business_role[]
    );
$$;

DROP POLICY IF EXISTS "business_assets_member_upload" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_member_update" ON storage.objects;
DROP POLICY IF EXISTS "business_assets_member_delete" ON storage.objects;

CREATE POLICY "business_assets_member_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'business-assets'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text
        FROM public.business_members bm
        WHERE bm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "business_assets_member_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text
        FROM public.business_members bm
        WHERE bm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "business_assets_member_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'business-assets'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] IN (
        SELECT bm.business_id::text
        FROM public.business_members bm
        WHERE bm.user_id = auth.uid()
      )
    )
  );
