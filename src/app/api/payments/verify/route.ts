import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchPaystackTransaction, confirmOrderPayment } from '@/lib/paystack'
import { alertPaymentReview } from '@/lib/alerts'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// Called by the checkout page after Paystack's popup closes. It does NOT trust the browser:
// it asks Paystack whether the transaction succeeded and compares amount and currency with the
// order before marking it paid. Safe to call repeatedly (idempotent).
export async function POST(req: NextRequest) {
  const limit = rateLimit(`verify:${clientIp(req.headers)}`, 60, 60 * 60 * 1000)
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json().catch(() => ({ reference: '' }))
  if (typeof reference !== 'string' || !reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

  // Only the order's owner (or an admin) may trigger verification for it
  const { data: owned } = await db.from('orders').select('id, user_id').eq('paystack_reference', reference).limit(2)
  if (!owned || owned.length === 0) return NextResponse.json({ status: 'pending', detail: 'order_not_found' })
  if (owned.some(o => o.user_id !== user.id)) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tx, error } = await fetchPaystackTransaction(reference)
  if (!tx) return NextResponse.json({ status: 'pending', detail: error || 'unverified' })

  const result = await confirmOrderPayment(db, tx)
  if (result.state === 'amount_mismatch' && result.review?.firstTime && result.order) {
    await alertPaymentReview({ orderId: result.order.id, reference: tx.reference, ...result.review })
  }
  const status = result.state === 'paid' || result.state === 'already_paid' ? 'paid'
    : result.state === 'amount_mismatch' ? 'review' : 'pending'
  return NextResponse.json({ status, detail: result.state })
}
