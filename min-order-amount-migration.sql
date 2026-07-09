-- Migration: add min_order_amount to products
-- Run in Supabase SQL editor.
-- NULL means no minimum is enforced for that product.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12, 2) NULL;

COMMENT ON COLUMN public.products.min_order_amount IS
  'If set, the live price calculator will charge at least this amount even if the '
  'computed price (base + add-ons + VAT) is lower. Useful for area-based products '
  'where very small dimensions would produce unrealistically cheap quotes.';
