-- Saved invoice line descriptions for autocomplete / quick-add

CREATE TABLE public.invoice_line_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  description text NOT NULL,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  cost_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  service_id uuid REFERENCES public.services (id) ON DELETE SET NULL,
  use_count integer NOT NULL DEFAULT 1 CHECK (use_count >= 1),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_line_presets_description_not_blank
    CHECK (length(trim(description)) > 0)
);

CREATE UNIQUE INDEX invoice_line_presets_business_description_uidx
  ON public.invoice_line_presets (business_id, lower(trim(description)));

CREATE INDEX invoice_line_presets_business_last_used_idx
  ON public.invoice_line_presets (business_id, last_used_at DESC);

CREATE TRIGGER invoice_line_presets_updated_at
  BEFORE UPDATE ON public.invoice_line_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.invoice_line_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_line_presets_select_member"
  ON public.invoice_line_presets FOR SELECT TO authenticated
  USING (private.is_business_member(business_id));

CREATE POLICY "invoice_line_presets_insert_member"
  ON public.invoice_line_presets FOR INSERT TO authenticated
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "invoice_line_presets_update_member"
  ON public.invoice_line_presets FOR UPDATE TO authenticated
  USING (private.is_business_member(business_id))
  WITH CHECK (private.is_business_member(business_id));

CREATE POLICY "invoice_line_presets_delete_member"
  ON public.invoice_line_presets FOR DELETE TO authenticated
  USING (private.is_business_member(business_id));

-- Backfill from past invoice lines (newest price wins via order)
INSERT INTO public.invoice_line_presets (
  business_id,
  description,
  unit_price,
  cost_price,
  service_id,
  use_count,
  last_used_at
)
SELECT
  i.business_id,
  trim(ii.description) AS description,
  (ARRAY_AGG(ii.unit_price ORDER BY ii.created_at DESC))[1] AS unit_price,
  (ARRAY_AGG(ii.cost_price ORDER BY ii.created_at DESC))[1] AS cost_price,
  (ARRAY_AGG(ii.service_id ORDER BY ii.created_at DESC))[1] AS service_id,
  COUNT(*)::integer AS use_count,
  MAX(COALESCE(i.issued_at, i.updated_at, i.created_at)) AS last_used_at
FROM public.invoice_items ii
JOIN public.invoices i ON i.id = ii.invoice_id
WHERE length(trim(ii.description)) > 0
GROUP BY i.business_id, lower(trim(ii.description)), trim(ii.description)
ON CONFLICT DO NOTHING;
