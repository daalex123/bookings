-- Dynamic per-business job checklist templates + job snapshots

CREATE TYPE public.job_checklist_item_type AS ENUM ('status', 'text', 'number');

CREATE TABLE public.job_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  status_options jsonb NOT NULL DEFAULT '[
    {"code":"ok","label":"Checked"},
    {"code":"A","label":"Adjusted"},
    {"code":"C","label":"Clean"},
    {"code":"R","label":"Replace"},
    {"code":"X","label":"Problem"},
    {"code":"N/A","label":"Not applicable"}
  ]'::jsonb,
  header_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_checklist_templates_business_id_idx
  ON public.job_checklist_templates (business_id);

CREATE TRIGGER job_checklist_templates_updated_at
  BEFORE UPDATE ON public.job_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_checklist_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.job_checklist_templates (id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX job_checklist_template_sections_template_id_idx
  ON public.job_checklist_template_sections (template_id, sort_order);

CREATE TABLE public.job_checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.job_checklist_template_sections (id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  item_type public.job_checklist_item_type NOT NULL DEFAULT 'status'
);

CREATE INDEX job_checklist_template_items_section_id_idx
  ON public.job_checklist_template_items (section_id, sort_order);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_checklist_template_id uuid
    REFERENCES public.job_checklist_templates (id) ON DELETE SET NULL;

CREATE INDEX services_default_checklist_template_id_idx
  ON public.services (default_checklist_template_id)
  WHERE default_checklist_template_id IS NOT NULL;

CREATE TABLE public.job_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.job_checklist_templates (id) ON DELETE SET NULL,
  title text NOT NULL,
  status_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  header_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  header_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_checklists_job_id_idx ON public.job_checklists (job_id);
CREATE INDEX job_checklists_business_id_idx ON public.job_checklists (business_id);

CREATE TRIGGER job_checklists_updated_at
  BEFORE UPDATE ON public.job_checklists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_checklist_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.job_checklists (id) ON DELETE CASCADE,
  section_title text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  item_type public.job_checklist_item_type NOT NULL DEFAULT 'status',
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_checklist_responses_checklist_id_idx
  ON public.job_checklist_responses (checklist_id, sort_order);

CREATE TRIGGER job_checklist_responses_updated_at
  BEFORE UPDATE ON public.job_checklist_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_checklist_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_checklist_responses ENABLE ROW LEVEL SECURITY;

-- Templates: members only
CREATE POLICY "job_checklist_templates_member_all"
  ON public.job_checklist_templates FOR ALL TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "job_checklist_template_sections_member_all"
  ON public.job_checklist_template_sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_checklist_templates t
      WHERE t.id = job_checklist_template_sections.template_id
        AND private.is_business_member(t.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_checklist_templates t
      WHERE t.id = job_checklist_template_sections.template_id
        AND private.is_business_member(t.business_id)
    )
  );

CREATE POLICY "job_checklist_template_items_member_all"
  ON public.job_checklist_template_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_checklist_template_sections s
      JOIN public.job_checklist_templates t ON t.id = s.template_id
      WHERE s.id = job_checklist_template_items.section_id
        AND private.is_business_member(t.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.job_checklist_template_sections s
      JOIN public.job_checklist_templates t ON t.id = s.template_id
      WHERE s.id = job_checklist_template_items.section_id
        AND private.is_business_member(t.business_id)
    )
  );

-- Job snapshots: members write, customers read their own jobs
CREATE POLICY "job_checklists_select_member_or_customer"
  ON public.job_checklists FOR SELECT TO authenticated
  USING (
    private.is_business_member(business_id)
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_checklists.job_id
        AND j.customer_id = auth.uid()
    )
  );

CREATE POLICY "job_checklists_insert_member"
  ON public.job_checklists FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "job_checklists_update_member"
  ON public.job_checklists FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "job_checklists_delete_member"
  ON public.job_checklists FOR DELETE TO authenticated
  USING (private.is_business_member(business_id));

CREATE POLICY "job_checklist_responses_select_member_or_customer"
  ON public.job_checklist_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_checklists c
      WHERE c.id = job_checklist_responses.checklist_id
        AND (
          private.is_business_member(c.business_id)
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = c.job_id
              AND j.customer_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "job_checklist_responses_insert_member"
  ON public.job_checklist_responses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_checklists c
      WHERE c.id = job_checklist_responses.checklist_id
        AND private.is_business_member(c.business_id)
    )
  );

CREATE POLICY "job_checklist_responses_update_member"
  ON public.job_checklist_responses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_checklists c
      WHERE c.id = job_checklist_responses.checklist_id
        AND private.is_business_member(c.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_checklists c
      WHERE c.id = job_checklist_responses.checklist_id
        AND private.is_business_member(c.business_id)
    )
  );

CREATE POLICY "job_checklist_responses_delete_member"
  ON public.job_checklist_responses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_checklists c
      WHERE c.id = job_checklist_responses.checklist_id
        AND private.is_business_member(c.business_id)
    )
  );
