-- ============================================================
-- Migration: Enforce affiliate consistency
-- Run in Supabase SQL editor.
-- ============================================================

-- ── Step 1: Backfill — find and fix existing broken accounts ─────────────────
-- (is_affiliate = true but no affiliates row)

-- To preview what will be backfilled, run this SELECT first:
-- SELECT p.id, p.first_name, p.last_name, p.email
-- FROM public.profiles p
-- LEFT JOIN public.affiliates a ON a.profile_id = p.id
-- WHERE p.is_affiliate = true AND a.id IS NULL;

INSERT INTO public.affiliates (profile_id, referral_code, is_active)
SELECT
  p.id,
  -- Code = first 6 chars of name + first 6 chars of UUID (collision-proof)
  UPPER(
    SUBSTRING(REGEXP_REPLACE(p.first_name, '[^a-zA-Z0-9]', '', 'g'), 1, 6) ||
    SUBSTRING(REPLACE(p.id::text, '-', ''), 1, 6)
  ),
  true
FROM public.profiles p
LEFT JOIN public.affiliates a ON a.profile_id = p.id
WHERE p.is_affiliate = true
  AND a.id IS NULL
ON CONFLICT (profile_id) DO NOTHING;


-- ── Step 2: Trigger function ──────────────────────────────────────────────────
-- Fires whenever is_affiliate becomes true on any profile.
-- Inserts an affiliates row if one doesn't already exist.

CREATE OR REPLACE FUNCTION public.ensure_affiliate_row()
RETURNS TRIGGER AS $$
DECLARE
  gen_code TEXT;
  attempt  INT := 0;
BEGIN
  -- Only act when is_affiliate is true
  IF NEW.is_affiliate = true THEN
    -- Short-circuit: row already exists, nothing to do
    IF EXISTS (SELECT 1 FROM public.affiliates WHERE profile_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Generate a unique referral code, retrying on collisions
    LOOP
      gen_code := UPPER(
        SUBSTRING(REGEXP_REPLACE(NEW.first_name, '[^a-zA-Z0-9]', '', 'g'), 1, 6) ||
        SUBSTRING(REPLACE(uuid_generate_v4()::text, '-', ''), 1, 4)
      );

      BEGIN
        INSERT INTO public.affiliates (profile_id, referral_code, is_active)
        VALUES (NEW.id, gen_code, true);
        EXIT; -- inserted successfully
      EXCEPTION WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt >= 10 THEN
          RAISE EXCEPTION 'ensure_affiliate_row: could not generate unique code after 10 attempts for profile %', NEW.id;
        END IF;
        -- loop and try again
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── Step 3: Attach trigger ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS enforce_affiliate_consistency ON public.profiles;

CREATE TRIGGER enforce_affiliate_consistency
AFTER INSERT OR UPDATE OF is_affiliate ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_affiliate_row();
