import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runReconciliation } from '@/lib/reconcile'

export const dynamic = 'force-dynamic'

// Manual trigger from the admin Orders screen. Admin only. Same read-only check as the cron job;
// the result is returned to the screen and an alert email is sent if anything is unmatched.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const r = await runReconciliation(db)
  return NextResponse.json({
    ok: r.ok, error: r.error, checked: r.checked, skippedOther: r.skippedOther, alerted: r.alerted,
    unmatched: r.unmatched.map(t => ({ reference: t.reference, amount: t.amountKobo / 100, currency: t.currency, paidAt: t.paidAt, email: t.email })),
  })
}
