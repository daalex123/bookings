ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS next_service_name text;
