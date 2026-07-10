-- ──────────────────────────────────────────────────────────────────────────
-- Design Pricing System Migration
-- Run once in Supabase SQL editor.
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Design pricing columns on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS design_pricing_type TEXT
    CHECK (design_pricing_type IN ('none', 'flat', 'unit_based', 'dependent'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS design_flat_fee     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS design_unit_label   TEXT,        -- e.g. "Number of pages"
  ADD COLUMN IF NOT EXISTS design_unit_rate    NUMERIC(12,2), -- fee per unit
  ADD COLUMN IF NOT EXISTS design_min_units    INTEGER;      -- e.g. min 4 pages

-- 2. Reusable design add-ons (logo design, copywriting, etc.)
CREATE TABLE IF NOT EXISTS public.design_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12,2) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.design_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "design_addons_public_read" ON public.design_addons
  FOR SELECT USING (is_active = true);

CREATE POLICY "design_addons_admin_all" ON public.design_addons
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

-- 3. Product-to-addon linking with gating question
CREATE TABLE IF NOT EXISTS public.product_design_addons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  design_addon_id  UUID NOT NULL REFERENCES public.design_addons(id) ON DELETE CASCADE,
  gate_question    TEXT NOT NULL,
  gate_when_answer TEXT NOT NULL CHECK (gate_when_answer IN ('yes', 'no')),
  UNIQUE (product_id, design_addon_id)
);

ALTER TABLE public.product_design_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_design_addons_public_read" ON public.product_design_addons
  FOR SELECT USING (true);

CREATE POLICY "product_design_addons_admin_all" ON public.product_design_addons
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

-- 4. New columns on order_items to capture resolved design choices
-- Note: design_file_url and design_link already exist on this table.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS has_own_design        BOOLEAN,
  ADD COLUMN IF NOT EXISTS design_addons_selected JSONB,    -- [{"name": "Logo Design", "price": 15000}]
  ADD COLUMN IF NOT EXISTS design_units          NUMERIC,   -- page count etc. for unit_based
  ADD COLUMN IF NOT EXISTS design_cost_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS design_request_notes  TEXT;      -- free-text brief for design team
