-- Staff-to-service assignment join table
CREATE TABLE IF NOT EXISTS public.staff_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.business_members (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, service_id)
);

CREATE INDEX IF NOT EXISTS staff_services_member_id_idx ON public.staff_services (member_id);
CREATE INDEX IF NOT EXISTS staff_services_service_id_idx ON public.staff_services (service_id);

-- RLS
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

-- Members of the business can read/write staff_services
CREATE POLICY "Business members can manage staff_services"
  ON public.staff_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.id = staff_services.member_id
        AND bm.business_id IN (
          SELECT bm2.business_id FROM public.business_members bm2
          WHERE bm2.user_id = auth.uid()
            AND bm2.role IN ('owner', 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.id = staff_services.member_id
        AND bm.business_id IN (
          SELECT bm2.business_id FROM public.business_members bm2
          WHERE bm2.user_id = auth.uid()
            AND bm2.role IN ('owner', 'admin')
        )
    )
  );
