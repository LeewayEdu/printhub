-- ──────────────────────────────────────────────────────────────────────────
-- Admin Audit Log
-- Run once in the Supabase SQL editor to enable admin action logging.
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action           TEXT NOT NULL,          -- e.g. 'reset_password', 'disable_affiliate'
  target_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_entity_id UUID,                   -- generic FK for non-profile targets (e.g. affiliate.id)
  target_email     TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs; inserts happen server-side via service role
CREATE POLICY "audit_logs_admin_read" ON public.admin_audit_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin')
    )
  );
