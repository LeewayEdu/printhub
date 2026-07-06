-- ============================================================
-- REFERRAL SYSTEM MIGRATION
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── 1. REFERRALS TABLE ───────────────────────────────────────
-- One row per (affiliate, referred customer) pair.
-- Created at signup when a ?ref= code is captured.
-- Updated by the Paystack webhook each time the customer pays.

CREATE TABLE IF NOT EXISTS public.referrals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id     UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  total_orders     INTEGER       NOT NULL DEFAULT 0,
  total_spent      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (affiliate_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON public.referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_profile   ON public.referrals(profile_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Affiliate can read their own referrals.
-- The affiliates table FK column may be called profile_id or user_id depending
-- on when the live DB was set up — detect at runtime via information_schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'affiliates' AND column_name = 'profile_id'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "referrals_affiliate_read" ON public.referrals
        FOR SELECT USING (
          affiliate_id IN (SELECT id FROM public.affiliates WHERE profile_id = auth.uid())
        )
    $pol$;
  ELSE
    EXECUTE $pol$
      CREATE POLICY "referrals_affiliate_read" ON public.referrals
        FOR SELECT USING (
          affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
        )
    $pol$;
  END IF;
END $$;

-- ── 2. ADMIN RLS BYPASS POLICIES ─────────────────────────────
-- The admin affiliates page uses the anon client (RLS applies), so
-- admins need explicit read access to all affiliates/commissions/referrals.
-- Check whether the profiles table uses 'role' before creating policies.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "affiliates_admin_read" ON public.affiliates
        FOR SELECT USING (
          auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
        )
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "commissions_admin_read" ON public.commissions
        FOR SELECT USING (
          auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
        )
    $pol$;
    EXECUTE $pol$
      CREATE POLICY "referrals_admin_read" ON public.referrals
        FOR SELECT USING (
          auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
        )
    $pol$;
  ELSE
    RAISE NOTICE 'profiles.role column not found — skipping admin bypass policies. Add them manually if your admin column has a different name.';
  END IF;
END $$;

-- ── 3. ALSO ADD legal_name AND occupation COLUMNS IF MISSING ─
-- The affiliate join form collects these but they may not be in the live schema.

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Done! ✅
-- After running this, test by:
--   1. Visiting printhub.cchumedia.com?ref=YOURCODE and registering a new account.
--   2. Checking the new user's profiles row: referred_by should be populated.
--   3. Checking affiliates.total_referrals — should have incremented by 1.
--   4. Checking the referrals table — should have a new row for the new user.
