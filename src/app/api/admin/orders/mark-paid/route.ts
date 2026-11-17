import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withOptionalColumns } from '@/lib/order-columns'

// An admin marks an order paid BY HAND (bank transfer received, cash, and so on). A written reason is
// required, and who did it and when is recorded on the order (payment_note) and in the admin audit log.
// This is separate from card payments, which only the server can mark paid after Paystack confirms.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role, email').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
  if (note.length < 5) return NextResponse.json({ error: 'A note of at least 5 characters is required, for example "bank transfer received, ref 12345".' }, { status: 400 })

  const { data: order } = await db.from('orders').select('id, status, payment_note, production_notes').eq('id', orderId).maybeSingle()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    return NextResponse.json({ error: `Order is already ${order.status}` }, { status: 409 })
  }

  const who = profile.email || user.email || user.id
  const now = new Date().toISOString()
  const line = `[${now}] Marked paid by hand by ${who} (${user.id}): ${note}`

  // Compare-and-set so two admins cannot both do it. payment_note holds the record when the column
  // exists; before the payment fields migration it goes into production_notes instead.
  const res = await withOptionalColumns(inc => db.from('orders').update({
    status: 'paid', receipt_verified: true, verified_at: now, verified_by: user.id, updated_at: now,
    ...(inc
      ? { payment_note: order.payment_note ? `${order.payment_note}\n${line}` : line }
      : { production_notes: order.production_notes ? `${order.production_notes}\n${line}` : line }),
  }).eq('id', orderId).in('status', ['pending', 'payment_review', 'cancelled']).select('id'))
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 })
  if (!res.data || res.data.length === 0) return NextResponse.json({ error: 'Order changed while you were working; refresh and try again.' }, { status: 409 })

  let audited = true
  try {
    const { error } = await db.from('admin_audit_logs').insert({
      admin_id: user.id, action: 'mark_order_paid_manually', target_entity_id: orderId, note: `${note} (previous status: ${order.status})`,
    })
    if (error) audited = false
  } catch { audited = false }

  return NextResponse.json({ ok: true, audited })
}
