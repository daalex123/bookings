-- Allow non-registered staff: make user_id nullable, add name/phone fields
ALTER TABLE public.business_members
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS staff_name text,
  ADD COLUMN IF NOT EXISTS staff_phone text,
  ADD COLUMN IF NOT EXISTS staff_email text;

-- Drop the unique constraint on (business_id, user_id) since user_id can be null
ALTER TABLE public.business_members
  DROP CONSTRAINT IF EXISTS business_members_business_id_user_id_key;

-- Re-add unique constraint only for linked users (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS business_members_business_user_unique
  ON public.business_members (business_id, user_id)
  WHERE user_id IS NOT NULL;
