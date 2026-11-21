// Meta Pixel events for Purchase, Lead and AddToCart. Client-side only, fired AFTER success; nothing here touches orders,
// prices, payment checks or the leads route. No email, phone, name or address is ever put in a payload.
import { fbTrack } from '@/lib/meta-pixel'

/** What Purchase needs from an order row. Only these fields are read. */
export interface PurchaseOrderFields {
  id?: string | null
  status?: string | null
  is_test?: boolean | null
  paystack_reference?: string | null
  paystack_status?: string | null
  paid_amount?: number | string | null
  currency?: string | null
}

export interface PurchaseEvent { orderId: string; params: { value: number; currency: 'NGN' }; }

/** The Purchase event for an order, or null. Only an order the SERVER has confirmed paid with Paystack counts: status is 'paid',
 *  Paystack says success, a reference and a paid amount are stored. Test orders, pending, bank-transfer-pending, review,
 *  failed and non-naira orders never count. The value is the amount Paystack confirmed (paid_amount), in naira. */
export function purchaseEventFor(order: PurchaseOrderFields | null | undefined): PurchaseEvent | null {
  if (!order || !order.id) return null
  if (order.status !== 'paid') return null
  if (order.is_test === true) return null
  if (!order.paystack_reference || order.paystack_status !== 'success') return null
  if (order.currency && String(order.currency).toUpperCase() !== 'NGN') return null
  const value = Number(order.paid_amount)
  if (!Number.isFinite(value) || value <= 0) return null
  return { orderId: String(order.id), params: { value, currency: 'NGN' } }
}

const GUARD_PREFIX = 'printhub-pixel-purchase-'
function guardGet(orderId: string): boolean { try { return window.localStorage.getItem(GUARD_PREFIX + orderId) === '1' } catch { return false } }
function guardSet(orderId: string) { try { window.localStorage.setItem(GUARD_PREFIX + orderId, '1') } catch { /* private mode: the event id still de-duplicates at Meta */ } }

const inFlight = new Set<string>()

/** Fires Purchase once per order: skipped when this browser already sent it. The event id is the order id, so Meta also
 *  drops a repeat. Waits (up to about 10 seconds) for the Pixel script, and marks the order only once the event was sent. */
export function trackPurchaseOnce(order: PurchaseOrderFields | null | undefined, opts: { waitMs?: number; stepMs?: number } = {}): boolean {
  const ev = purchaseEventFor(order)
  if (!ev || typeof window === 'undefined') return false
  if (guardGet(ev.orderId) || inFlight.has(ev.orderId)) return false
  inFlight.add(ev.orderId)
  const waitMs = opts.waitMs ?? 10_000
  const stepMs = opts.stepMs ?? 250
  let waited = 0
  const attempt = () => {
    if (typeof window.fbq === 'function') {
      if (!guardGet(ev.orderId)) {
        fbTrack('Purchase', ev.params, ev.orderId)
        guardSet(ev.orderId)
      }
      inFlight.delete(ev.orderId)
      return
    }
    waited += stepMs
    if (waited >= waitMs) { inFlight.delete(ev.orderId); return } // pixel not loaded (blocked or staff page): nothing sent, nothing marked
    setTimeout(attempt, stepMs)
  }
  attempt()
  return true
}

/** Lead: call only after the leads route answered with success. `source` is a generic label such as 'chatbot' or
 *  'case_study', never anything the visitor typed. */
export function trackLead(source: string) {
  fbTrack('Lead', { content_category: String(source).slice(0, 40) })
}

/** Reads a /api/leads response: true only for an HTTP success whose body says ok. */
export async function leadSucceeded(res: Response): Promise<boolean> {
  if (!res.ok) return false
  try { return (await res.json())?.ok === true } catch { return false }
}

/** AddToCart: product name and value only. */
export function trackAddToCart(name: string, value: number) {
  fbTrack('AddToCart', { content_name: name, content_type: 'product', value, currency: 'NGN' })
}
