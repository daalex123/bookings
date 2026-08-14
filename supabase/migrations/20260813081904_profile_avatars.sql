-- Profile photos for customers, admin users, and staff

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE OR REPLACE FUNCTION private.shares_business_with(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members me
    JOIN public.business_members them
      ON them.business_id = me.business_id
     AND them.user_id = p_profile_id
    WHERE me.user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "profiles_select_super_admin" ON public.profiles;
CREATE POLICY "profiles_select_super_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.is_super_admin());

DROP POLICY IF EXISTS "profiles_select_business_colleagues" ON public.profiles;
CREATE POLICY "profiles_select_business_colleagues"
  ON public.profiles FOR SELECT TO authenticated
  USING (private.shares_business_with(id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'staff'
        AND private.is_business_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'staff'
        AND private.is_business_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'staff'
        AND private.is_business_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      private.is_super_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'staff'
        AND private.is_business_admin(((storage.foldername(name))[2])::uuid)
      )
    )
  );
