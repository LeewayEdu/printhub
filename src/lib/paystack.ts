// Server-only payment confirmation. This is the ONLY code that marks a Paystack order as paid.
// Both the signed webhook and the browser-triggered verify route call confirmOrderPayment(), so
// the checks are identical and the result is idempotent: confirming twice changes nothing the
// second time. Browser code can never set an order to paid.

import type { SupabaseClient } from '@supabase/supabase-js'
import { withOptionalColumns } from '@/lib/order-columns'

// Overridable so tests can point at a local mock instead of Paystack
const PAYSTACK_BASE = process.env.PAYSTACK_API_BASE || 'https://api.paystack.co'

// Statuses that mean "already paid or beyond"
export const PAID_OR_LATER = ['paid', 'processing', 'shipped', 'delivered']

export interface PaystackTx { reference: string; status: string; amountKobo: number; currency: string; domain?: string }

/** Asks Paystack itself whether the transaction really succeeded. Never trusts the browser. */
export async function fetchPaystackTransaction(reference: string): Promise<{ tx?: PaystackTx; error?: string }> {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return { error: 'PAYSTACK_SECRET_KEY not set' }
  if (!/^[A-Za-z0-9_.=-]{6,100}$/.test(reference)) return { error: 'invalid reference' }
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store',
    })
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok || !json?.status || !json?.data) return { error: json?.message || `Paystack HTTP ${res.status}` }
    const d = json.data
    return { tx: { reference: String(d.reference), status: String(d.status), amountKobo: Number(d.amount), currency: String(d.currency), domain: d.domain ? String(d.domain) : undefined } }
  } catch (e: any) {
    return { error: e?.message || 'Paystack unreachable' }
  }
}

export type ConfirmState =
  | 'paid'              // newly marked paid by this call
  | 'already_paid'      // was already paid (idempotent no-op)
  | 'not_successful'    // Paystack says the payment did not succeed (yet)
  | 'order_not_found'   // no order carries this reference
  | 'reference_conflict'// more than one order carries this reference
  | 'amount_mismatch'   // paid amount or currency differs from the order: held for review

export interface ConfirmResult {
  state: ConfirmState
  order?: any
  /** Set when the order is held for review; firstTime is true only on the call that moved it there */
  review?: { expectedNaira: number; paidNaira: number; currency: string; firstTime: boolean }
}

/** What the verify response tells us, stored on the order. A test-mode transaction marks the order as a test. */
function verifiedFields(tx: PaystackTx): Record<string, unknown> {
  return { paystack_status: tx.status, ...(tx.domain === 'test' ? { is_test: true } : {}) }
}

export async function confirmOrderPayment(db: SupabaseClient, tx: PaystackTx): Promise<ConfirmResult> {
  if (tx.status !== 'success') {
    // Remember what Paystack said (abandoned, failed, ...) on an order that is not paid yet. Best effort.
    await withOptionalColumns(inc => {
      if (!inc) return Promise.resolve({})
      return db.from('orders').update({ paystack_status: tx.status }).eq('paystack_reference', tx.reference).in('status', ['pending', 'payment_review'])
    })
    return { state: 'not_successful' }
  }

  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, total_amount, user_id, email, first_name, last_name')
    .eq('paystack_reference', tx.reference)
    .limit(2)
  if (error || !orders || orders.length === 0) return { state: 'order_not_found' }
  if (orders.length > 1) return { state: 'reference_conflict' }
  const order = orders[0]

  if (PAID_OR_LATER.includes(order.status)) return { state: 'already_paid', order }

  // Amount and currency must match the order exactly (₦1 rounding allowed)
  const paidNaira = tx.amountKobo / 100
  if (tx.currency !== 'NGN' || Math.abs(paidNaira - Number(order.total_amount)) > 1) {
    const firstTime = order.status !== 'payment_review'
    await withOptionalColumns(inc => db.from('orders')
      .update({ status: 'payment_review', ...(inc ? { ...verifiedFields(tx), paid_amount: paidNaira } : {}) })
      .eq('id', order.id).in('status', ['pending', 'payment_review']))
    return { state: 'amount_mismatch', order, review: { expectedNaira: Number(order.total_amount), paidNaira, currency: tx.currency, firstTime } }
  }

  // Compare-and-set: only a still-unpaid order can become paid, so two callers cannot both win
  const { data: updated } = await withOptionalColumns(inc => db
    .from('orders')
    .update({ status: 'paid', updated_at: new Date().toISOString(), ...(inc ? { ...verifiedFields(tx), paid_amount: paidNaira } : {}) })
    .eq('id', order.id)
    .in('status', ['pending', 'payment_review'])
    .select('id'))
  if (!updated || updated.length === 0) return { state: 'already_paid', order }
  return { state: 'paid', order }
}
