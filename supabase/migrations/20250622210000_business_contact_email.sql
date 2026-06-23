-- Primary business email for booking alerts and customer communication

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS contact_email text;

COMMENT ON COLUMN public.businesses.contact_email IS
  'Main business inbox for booking notifications and customer communication';
