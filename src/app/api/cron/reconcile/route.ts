import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { runReconciliation } from '@/lib/reconcile'

export const dynamic = 'force-dynamic'

// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>". With no CRON_SECRET configured
// the route refuses every request, so it is never open to the public.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('authorization') || ''
  const expected = `Bearer ${secret || ''}`
  const ok = !!secret && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const r = await runReconciliation(supabaseAdmin())
  return NextResponse.json({ ok: r.ok, error: r.error, checked: r.checked, skippedOther: r.skippedOther, unmatched: r.unmatched.length, alerted: r.alerted })
}
