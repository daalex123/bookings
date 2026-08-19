-- Business address, extra phone, customer unique-key mapping, and print header/footer template.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS customer_unique_key_field text,
  ADD COLUMN IF NOT EXISTS document_template jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.businesses.address IS
  'Physical / mailing address shown on invoices, checklists, and other documents.';
COMMENT ON COLUMN public.businesses.contact_phone IS
  'Primary business phone number shown on documents (separate from WhatsApp).';
COMMENT ON COLUMN public.businesses.customer_unique_key_field IS
  'Name of the booking custom field used as the customer unique key (e.g. vehicle_number).';
COMMENT ON COLUMN public.businesses.document_template IS
  'Header/footer layout for generated invoices and checklists.';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_unique_key text,
  ADD COLUMN IF NOT EXISTS customer_unique_key_label text;

COMMENT ON COLUMN public.invoices.customer_unique_key IS
  'Snapshot of the mapped unique custom-field value at invoice creation.';
COMMENT ON COLUMN public.invoices.customer_unique_key_label IS
  'Label for the unique custom-field snapshot (e.g. Vehicle Number).';
