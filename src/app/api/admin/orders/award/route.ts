import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { awardCommissionForOrder } from '@/lib/commissions'

// Called by the admin Orders screen after it marks an order delivered. Admin-only; the order must
// really be 'delivered'. Safe to call repeatedly: each award happens at most once per order.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { orderId } = await req.json().catch(() => ({ orderId: '' }))
  if (typeof orderId !== 'string' || !orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const commission = await awardCommissionForOrder(db, orderId)
  if (commission.state === 'error') console.error('[award] commission failed for order', orderId, commission.detail)
  return NextResponse.json({ commission })
}
