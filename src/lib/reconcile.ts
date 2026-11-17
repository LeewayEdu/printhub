// Reconciliation: finds successful Paystack payments from the last 48 hours that have no order.
// READ-ONLY against Paystack (GET /transaction list only) and read-only against the database.
// It never marks anything paid and never creates orders; it only reports.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendAdminAlert } from '@/lib/alerts'

const PAYSTACK_BASE = process.env.PAYSTACK_API_BASE || 'https://api.paystack.co'
// This Paystack account may also take payments for other C-Chu services; only references made by
// the PrintHub checkout are ours to reconcile.
export const PRINTHUB_REF_PREFIX = 'PRINTHUB-'
export const WINDOW_HOURS = 48

export interface PaystackListedTx { reference: string; amountKobo: number; currency: string; paidAt: string; email: string }
export interface ReconcileResult {
  ok: boolean
  error?: string
  checked: number              // PrintHub payments seen at Paystack in the window
  skippedOther: number         // successful payments with another reference format
  unmatched: PaystackListedTx[]
}

export type FetchLike = (url: string, init?: any) => Promise<{ ok: boolean; status: number; json: () => Promise<any> }>

/** Lists successful transactions in the window (paged). GET only. */
export async function listSuccessfulTransactions(secret: string, fetchImpl: FetchLike, now = new Date()): Promise<{ txs?: PaystackListedTx[]; error?: string }> {
  const from = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000).toISOString()
  const txs: PaystackListedTx[] = []
  for (let page = 1; page <= 20; page++) {
    const url = `${PAYSTACK_BASE}/transaction?status=success&perPage=100&page=${page}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(now.toISOString())}`
    const res = await fetchImpl(url, { method: 'GET', headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !Array.isArray(json?.data)) return { error: json?.message || `Paystack HTTP ${res.status}` }
    for (const d of json.data) {
      if (d.status !== 'success') continue
      txs.push({
        reference: String(d.reference), amountKobo: Number(d.amount), currency: String(d.currency),
        paidAt: String(d.paid_at || d.paidAt || d.created_at || ''), email: String(d.customer?.email || ''),
      })
    }
    const pageCount = Number(json?.meta?.pageCount || 1)
    if (page >= pageCount) break
  }
  return { txs }
}

export async function findUnmatchedPayments(db: SupabaseClient, secret: string, fetchImpl: FetchLike, now = new Date()): Promise<ReconcileResult> {
  const listed = await listSuccessfulTransactions(secret, fetchImpl, now)
  if (!listed.txs) return { ok: false, error: listed.error, checked: 0, skippedOther: 0, unmatched: [] }
  const ours = listed.txs.filter(t => t.reference.startsWith(PRINTHUB_REF_PREFIX))
  const skippedOther = listed.txs.length - ours.length
  if (ours.length === 0) return { ok: true, checked: 0, skippedOther, unmatched: [] }

  const { data, error } = await db.from('orders').select('paystack_reference').in('paystack_reference', ours.map(t => t.reference))
  if (error) return { ok: false, error: `database read failed: ${error.message}`, checked: ours.length, skippedOther, unmatched: [] }
  const known = new Set((data || []).map((r: any) => r.paystack_reference))
  return { ok: true, checked: ours.length, skippedOther, unmatched: ours.filter(t => !known.has(t.reference)) }
}

/** Runs the check and emails an alert when anything is unmatched (or when the check itself failed). */
export async function runReconciliation(db: SupabaseClient, opts: { fetchImpl?: FetchLike; now?: Date; alert?: typeof sendAdminAlert } = {}): Promise<ReconcileResult & { alerted: boolean }> {
  const secret = process.env.PAYSTACK_SECRET_KEY
  const alert = opts.alert || sendAdminAlert
  if (!secret) return { ok: false, error: 'PAYSTACK_SECRET_KEY not set', checked: 0, skippedOther: 0, unmatched: [], alerted: false }
  const result = await findUnmatchedPayments(db, secret, opts.fetchImpl || (fetch as unknown as FetchLike), opts.now)

  let alerted = false
  if (!result.ok) {
    alerted = await alert('Payment reconciliation could not run', [['Reason', result.error || 'unknown']], 'Nothing was changed. Check the Paystack key and database access.')
  } else if (result.unmatched.length > 0) {
    const lines: [string, string][] = [['Payments with no order', String(result.unmatched.length)], ['Window', `last ${WINDOW_HOURS} hours`]]
    result.unmatched.slice(0, 20).forEach((t, i) =>
      lines.push([`#${i + 1} ${t.reference}`, `₦${(t.amountKobo / 100).toLocaleString('en-NG')} ${t.currency}, ${t.email || 'no email'}, ${t.paidAt}`]))
    alerted = await alert(`${result.unmatched.length} Paystack payment${result.unmatched.length > 1 ? 's' : ''} with no order`, lines,
      'These payments succeeded at Paystack but no order carries the reference. The customer may have paid and closed the browser before the order was saved. Contact them, then create the order or refund. Nothing was changed automatically.')
  }
  return { ...result, alerted }
}
