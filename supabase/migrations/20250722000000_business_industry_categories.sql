-- Business industry categories and custom appointment fields

-- Add industry category to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS industry_category text DEFAULT 'general';

-- Add custom fields JSONB column to appointments for category-specific data
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Create index for custom fields queries
CREATE INDEX IF NOT EXISTS appointments_custom_fields_idx 
  ON public.appointments USING gin (custom_fields);

-- Add check constraint for valid industry categories
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_industry_category_check
  CHECK (industry_category IN (
    'general',
    'automotive',
    'salon_wellness',
    'healthcare',
    'fitness',
    'education',
    'home_services',
    'pets',
    'legal',
    'consulting'
  ));

COMMENT ON COLUMN public.businesses.industry_category IS 'Industry category that determines custom fields in booking forms';
COMMENT ON COLUMN public.appointments.custom_fields IS 'Category-specific custom data collected during booking (vehicle_number, etc)';
