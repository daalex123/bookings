-- Business WhatsApp number for booking alerts (new bookings, cancellations, etc.)

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS contact_whatsapp text;

COMMENT ON COLUMN public.businesses.contact_whatsapp IS
  'E.164 or local mobile number for WhatsApp booking alerts via Meta Cloud API.';
