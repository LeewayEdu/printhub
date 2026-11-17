// Affiliate commission: earned when an order is marked DELIVERED, for card and bank-transfer
// orders alike, and paid at most once per order. Server-only (service key).
//
// Rate by how many earlier orders from the same referred customer already earned this affiliate a
// commission: orders 1-5 earn 10%, orders 6-10 earn 5%, every order after that 3%.
// The commission base is the order's total_amount (what the customer paid), as before.
// Schema notes (live database): affiliates.profile_id owns the affiliate, profiles.referred_by holds
// the referrer's profile id, referrals uses referred_user_id.

import type { SupabaseClient } from '@supabase/supabase-js'

export function commissionRate(earlierOrders: number): number {
  return earlierOrders < 5 ? 0.10 : earlierOrders < 10 ? 0.05 : 0.03
}

export type AwardState =
  | 'awarded' | 'already_awarded' | 'not_delivered' | 'no_order'
  | 'test_order' | 'guest_order' | 'no_referrer' | 'no_affiliate' | 'inactive_affiliate' | 'error'

export interface AwardResult { state: AwardState; amount?: number; rate?: number; detail?: string }

export async function awardCommissionForOrder(db: SupabaseClient, orderId: string): Promise<AwardResult> {
  const { data: order } = await db.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (!order) return { state: 'no_order' }
  if (order.status !== 'delivered') return { state: 'not_delivered' }
  if (order.is_test) return { state: 'test_order' }   // test orders never earn commission
  if (!order.user_id) return { state: 'guest_order' }

  // Already paid for this order? (the unique index on commissions.order_id enforces this in the database too)
  const { data: existing } = await db.from('commissions').select('id').eq('order_id', order.id).limit(1)
  if (existing && existing.length) return { state: 'already_awarded' }

  const { data: profile } = await db.from('profiles').select('referred_by').eq('id', order.user_id).maybeSingle()
  if (!profile?.referred_by) return { state: 'no_referrer' }

  const { data: affiliate } = await db
    .from('affiliates').select('id, is_active, total_earnings, pending_payout')
    .eq('profile_id', profile.referred_by).maybeSingle()
  if (!affiliate) return { state: 'no_affiliate' }
  if (affiliate.is_active === false) return { state: 'inactive_affiliate' }

  const { data: earlier } = await db
    .from('commissions').select('id').eq('affiliate_id', affiliate.id).eq('referred_customer', order.user_id)
  const rate = commissionRate((earlier || []).length)
  const orderTotal = Number(order.total_amount) || 0
  const amount = Math.round(orderTotal * rate * 100) / 100

  const { error: insErr } = await db.from('commissions').insert({
    affiliate_id: affiliate.id, order_id: order.id, referred_customer: order.user_id,
    order_total: orderTotal, rate, amount, status: 'pending',
  })
  if (insErr) {
    if ((insErr as any).code === '23505') return { state: 'already_awarded' }   // lost a race: someone else paid it
    return { state: 'error', detail: insErr.message }
  }

  await db.from('affiliates').update({
    total_earnings: (Number(affiliate.total_earnings) || 0) + amount,
    pending_payout: (Number(affiliate.pending_payout) || 0) + amount,
  }).eq('id', affiliate.id)

  const { data: ref } = await db.from('referrals')
    .select('id, total_orders, total_spent, total_commission')
    .eq('affiliate_id', affiliate.id).eq('referred_user_id', order.user_id).maybeSingle()
  if (ref) {
    await db.from('referrals').update({
      total_orders: (ref.total_orders || 0) + 1,
      total_spent: (Number(ref.total_spent) || 0) + orderTotal,
      total_commission: (Number(ref.total_commission) || 0) + amount,
    }).eq('id', ref.id)
  } else {
    await db.from('referrals').insert({
      affiliate_id: affiliate.id, referred_user_id: order.user_id,
      total_orders: 1, total_spent: orderTotal, total_commission: amount,
    })
  }
  return { state: 'awarded', amount, rate }
}
