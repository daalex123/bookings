-- Business-level booking custom field overrides (JSON)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS booking_custom_fields jsonb;

COMMENT ON COLUMN public.businesses.booking_custom_fields IS
  'Optional business-level custom booking fields override. Falls back to category defaults when null.';
