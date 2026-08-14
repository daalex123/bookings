-- Saved checklist item labels for autocomplete / quick-add when building templates

CREATE TABLE public.checklist_item_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  label text NOT NULL,
  item_type public.job_checklist_item_type NOT NULL DEFAULT 'status',
  use_count integer NOT NULL DEFAULT 1 CHECK (use_count >= 1),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checklist_item_presets_label_not_blank
    CHECK (length(trim(label)) > 0)
);

CREATE UNIQUE INDEX checklist_item_presets_business_label_uidx
  ON public.checklist_item_presets (business_id, lower(trim(label)));

CREATE INDEX checklist_item_presets_business_last_used_idx
  ON public.checklist_item_presets (business_id, last_used_at DESC);

CREATE TRIGGER checklist_item_presets_updated_at
  BEFORE UPDATE ON public.checklist_item_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.checklist_item_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_item_presets_select_member"
  ON public.checklist_item_presets FOR SELECT TO authenticated
  USING (private.is_business_member(business_id));

CREATE POLICY "checklist_item_presets_insert_member"
  ON public.checklist_item_presets FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "checklist_item_presets_update_member"
  ON public.checklist_item_presets FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "checklist_item_presets_delete_member"
  ON public.checklist_item_presets FOR DELETE TO authenticated
  USING (private.is_business_member(business_id));

-- Backfill from template items
INSERT INTO public.checklist_item_presets (
  business_id,
  label,
  item_type,
  use_count,
  last_used_at
)
SELECT
  t.business_id,
  trim(i.label) AS label,
  (ARRAY_AGG(i.item_type ORDER BY i.sort_order))[1] AS item_type,
  COUNT(*)::integer AS use_count,
  MAX(t.updated_at) AS last_used_at
FROM public.job_checklist_template_items i
JOIN public.job_checklist_template_sections s ON s.id = i.section_id
JOIN public.job_checklist_templates t ON t.id = s.template_id
WHERE length(trim(i.label)) > 0
GROUP BY t.business_id, lower(trim(i.label)), trim(i.label)
ON CONFLICT DO NOTHING;
