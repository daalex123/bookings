-- Human-readable job numbers + recommended next service on a job

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS next_job_number integer NOT NULL DEFAULT 1;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_number text,
  ADD COLUMN IF NOT EXISTS next_service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS next_service_name text,
  ADD COLUMN IF NOT EXISTS next_service_due_on date,
  ADD COLUMN IF NOT EXISTS next_service_notes text,
  ADD COLUMN IF NOT EXISTS next_service_visible boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS jobs_next_service_id_idx
  ON public.jobs (next_service_id)
  WHERE next_service_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_job_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_year text := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
BEGIN
  IF NEW.job_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.businesses
  SET next_job_number = next_job_number + 1
  WHERE id = NEW.business_id
  RETURNING next_job_number - 1 INTO v_next;

  NEW.job_number := 'JOB-' || v_year || '-' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_assign_number ON public.jobs;
CREATE TRIGGER jobs_assign_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_job_number();

DO $$
DECLARE
  r record;
  v_next integer;
  v_year text;
BEGIN
  FOR r IN
    SELECT id, business_id, created_at
    FROM public.jobs
    WHERE job_number IS NULL
    ORDER BY created_at, id
  LOOP
    UPDATE public.businesses
    SET next_job_number = next_job_number + 1
    WHERE id = r.business_id
    RETURNING next_job_number - 1 INTO v_next;

    v_year := to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY');

    UPDATE public.jobs
    SET job_number = 'JOB-' || v_year || '-' || lpad(v_next::text, 4, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_number_unique_per_business;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_number_unique_per_business UNIQUE (business_id, job_number);
