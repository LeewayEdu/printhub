-- ============================================================
-- PRINTHUB DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS (extends Supabase auth.users) ──────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'affiliate')),
  loyalty_points  INTEGER NOT NULL DEFAULT 0,
  referral_code   TEXT UNIQUE,
  referred_by     UUID REFERENCES public.profiles(id),
  avatar_url      TEXT,
  is_affiliate    BOOLEAN NOT NULL DEFAULT false,
  heard_from      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT,
  description TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID NOT NULL REFERENCES public.categories(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  base_price      NUMERIC(12,2) NOT NULL,
  price_label     TEXT,           -- e.g. "From ₦5,000"
  unit            TEXT DEFAULT 'piece',
  min_quantity    INTEGER DEFAULT 1,
  is_quote_only   BOOLEAN NOT NULL DEFAULT false,
  requires_design BOOLEAN NOT NULL DEFAULT true,
  turnaround_days INTEGER,
  images          TEXT[],         -- Cloudinary URLs
  specs           JSONB,          -- flexible specs: size, material, finish, etc.
  bulk_tiers      JSONB,          -- [{qty: 100, price: 4500}, ...]
  is_active       BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STARTER KITS ─────────────────────────────────────────────
CREATE TABLE public.starter_kits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  tagline     TEXT,
  price       NUMERIC(12,2) NOT NULL,
  items       TEXT[],
  badge       TEXT,
  is_popular  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ORDERS ───────────────────────────────────────────────────
CREATE TABLE public.orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      TEXT NOT NULL UNIQUE,
  customer_id       UUID NOT NULL REFERENCES public.profiles(id),
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','in_production','ready','shipped','delivered','cancelled')),
  items             JSONB NOT NULL,          -- snapshot of cart items
  subtotal          NUMERIC(12,2) NOT NULL,
  discount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  points_redeemed   INTEGER NOT NULL DEFAULT 0,
  delivery_fee      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL,
  delivery_method   TEXT NOT NULL DEFAULT 'pickup'
                    CHECK (delivery_method IN ('pickup','abuja','national')),
  delivery_address  JSONB,
  design_files      TEXT[],                 -- Cloudinary URLs
  notes             TEXT,
  referral_code     TEXT,
  points_earned     INTEGER DEFAULT 0,
  payment_ref       TEXT,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','paid','refunded')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ORDER STATUS HISTORY ─────────────────────────────────────
CREATE TABLE public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AFFILIATES ───────────────────────────────────────────────
CREATE TABLE public.affiliates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        UUID NOT NULL UNIQUE REFERENCES public.profiles(id),
  referral_code     TEXT NOT NULL UNIQUE,
  total_referrals   INTEGER NOT NULL DEFAULT 0,
  total_earnings    NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_payout    NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_out          NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name         TEXT,
  account_number    TEXT,
  account_name      TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AFFILIATE COMMISSIONS ─────────────────────────────────────
CREATE TABLE public.commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id    UUID NOT NULL REFERENCES public.affiliates(id),
  order_id        UUID NOT NULL REFERENCES public.orders(id),
  referred_customer UUID NOT NULL REFERENCES public.profiles(id),
  order_total     NUMERIC(12,2) NOT NULL,
  rate            NUMERIC(5,4) NOT NULL,       -- e.g. 0.10, 0.05, 0.03
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','paid')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LOYALTY POINTS LOG ───────────────────────────────────────
CREATE TABLE public.loyalty_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES public.profiles(id),
  order_id    UUID REFERENCES public.orders(id),
  type        TEXT NOT NULL CHECK (type IN ('earn','redeem','adjust')),
  points      INTEGER NOT NULL,
  balance     INTEGER NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CONTACT MESSAGES ─────────────────────────────────────────
CREATE TABLE public.contact_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT NOT NULL,
  service     TEXT,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TESTIMONIALS ─────────────────────────────────────────────
CREATE TABLE public.testimonials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  company     TEXT,
  text        TEXT NOT NULL,
  rating      INTEGER DEFAULT 5,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_own" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- Orders: customers see only their orders
CREATE POLICY "orders_own" ON public.orders
  FOR ALL USING (auth.uid() = customer_id);

-- Affiliates: see only own record
CREATE POLICY "affiliates_own" ON public.affiliates
  FOR ALL USING (auth.uid() = profile_id);

-- Commissions: affiliates see their own
CREATE POLICY "commissions_own" ON public.commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE profile_id = auth.uid())
  );

-- Loyalty: users see their own
CREATE POLICY "loyalty_own" ON public.loyalty_log
  FOR SELECT USING (auth.uid() = profile_id);

-- Public readable tables (no RLS needed)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starter_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read"    ON public.products     FOR SELECT USING (is_active = true);
CREATE POLICY "categories_public_read"  ON public.categories   FOR SELECT USING (is_active = true);
CREATE POLICY "starter_kits_public_read" ON public.starter_kits FOR SELECT USING (is_active = true);

-- ── INDEXES ────────────────────────────────────────────────────
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_commissions_affiliate ON public.commissions(affiliate_id);
CREATE INDEX idx_loyalty_profile ON public.loyalty_log(profile_id);

-- ── SEED: CATEGORIES ──────────────────────────────────────────
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Banners & Large Format',   'banners',        '🎌', 1),
  ('Branded Souvenirs',        'souvenirs',      '🎁', 2),
  ('Papers & Stationery',      'stationery',     '📄', 3),
  ('Stickers & Labels',        'stickers',       '🏷️', 4),
  ('Signage & Installation',   'signage',        '🪧', 5),
  ('Book Publishing',          'publishing',     '📚', 6),
  ('Campaign Materials',       'campaign',       '🗳️', 7),
  ('Graphic Design',           'design',         '🎨', 8),
  ('Business Cards',           'business-cards', '💳', 9),
  ('Shirts & Uniforms',        'uniforms',       '👕', 10),
  ('Frames & Canvas',          'frames',         '🖼️', 11),
  ('Gift Items',               'gifts',          '🎀', 12),
  ('Vehicle Branding',         'vehicle',        '🚗', 13),
  ('Event Materials',          'events',         '🎪', 14);

-- ── SEED: STARTER KITS ────────────────────────────────────────
INSERT INTO public.starter_kits (name, slug, tagline, price, badge, is_popular, sort_order, items) VALUES
  ('Basic', 'basic', 'You just registered your business. Now look like one.', 75000, NULL, false, 1,
   ARRAY['250 Business Cards (both sides)', '1 Complimentary Slip pad (50 leaves)', '1 Letterhead design + 20 printed copies', '1 Rubber Stamp', 'Social Media profile setup (2 platforms)', 'Logo design (if needed)']),
  ('Standard', 'standard', 'Look established from day one.', 150000, 'Most Popular', true, 2,
   ARRAY['Everything in Basic', '500 Business Cards', '1 A5 Notepad (100 leaves, branded)', '2 Polo Shirts (branded)', '1 Pull-up Banner (standard size)', '1 Branded File Folder (50 pcs)', 'Google Business Profile setup', 'WhatsApp Business setup']),
  ('Premium', 'premium', 'Arrive in every room looking like a million naira.', 280000, NULL, false, 3,
   ARRAY['Everything in Standard', '1,000 Business Cards', '1 Branded Tote Bag (50 pcs)', '1 Branded Pen (100 pcs)', '1 Car Sticker (vinyl)', '1 Office Door Sign', '1 Roll-up Banner', 'Turnaround: 10–14 working days']);

-- Done! ✅
