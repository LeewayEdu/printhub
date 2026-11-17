// "Awaiting design file": a customer said "I have my file" but has not supplied it yet.
// Derived from fields the order items already have, so no new column is needed:
//   has_own_design === true  AND  no design_file_url  AND  no design_link
// Orders where PrintHub does the design (has_own_design === false) are not "awaiting a file".

export interface DesignItemLike {
  has_own_design?: boolean | null
  design_file_url?: string | null
  design_link?: string | null
}

export function itemAwaitingDesign(item: DesignItemLike): boolean {
  return item.has_own_design === true && !item.design_file_url && !item.design_link
}

export function orderAwaitingDesign(items: DesignItemLike[] | null | undefined): boolean {
  return (items || []).some(itemAwaitingDesign)
}

// Statuses where money is in, so a missing file is what is holding the job up.
export const REMINDER_ORDER_STATUSES = ['paid']
// Statuses an admin may not move an order into while a file is missing
export const PRODUCTION_STATUSES = ['processing', 'shipped', 'delivered']

/** True when moving to `nextStatus` would start production on an order that is still missing a design file. */
export function productionBlocked(items: DesignItemLike[] | null | undefined, nextStatus: string): boolean {
  return PRODUCTION_STATUSES.includes(nextStatus) && orderAwaitingDesign(items)
}

export type ReminderKind = '24h' | '72h'
export const REMINDER_HOURS: Record<ReminderKind, number> = { '24h': 24, '72h': 72 }
export const reminderAction = (k: ReminderKind) => `design_reminder_${k}`

export interface ReminderCandidate {
  id: string
  status: string
  created_at: string
  verified_at?: string | null
  email?: string | null
  items: DesignItemLike[]
}

/**
 * Which reminder, if any, is due for each order. Pure, so it can be tested.
 * - only paid orders that still await a file, and have an email to send to
 * - the clock starts when the money was confirmed (verified_at for bank transfers) or the order was created
 * - 24h reminder when 24h have passed and it has not been sent; 72h when 72h have passed and it has not been sent
 * - never both in one run, never one that was already sent, and a 72h reminder is not sent on top of an unsent
 *   24h one (the 24h goes first and the 72h follows on a later run)
 */
export function selectDueReminders(
  orders: ReminderCandidate[],
  alreadySent: Set<string>,                 // `${orderId}:${kind}`
  now: Date,
): { orderId: string; kind: ReminderKind }[] {
  const due: { orderId: string; kind: ReminderKind }[] = []
  for (const o of orders) {
    if (!REMINDER_ORDER_STATUSES.includes(o.status)) continue
    if (!orderAwaitingDesign(o.items)) continue
    if (!o.email) continue
    const startedAt = new Date(o.verified_at || o.created_at).getTime()
    if (!Number.isFinite(startedAt)) continue
    const hours = (now.getTime() - startedAt) / 3600000
    const sent24 = alreadySent.has(`${o.id}:24h`)
    const sent72 = alreadySent.has(`${o.id}:72h`)
    if (!sent24 && hours >= REMINDER_HOURS['24h']) due.push({ orderId: o.id, kind: '24h' })
    else if (sent24 && !sent72 && hours >= REMINDER_HOURS['72h']) due.push({ orderId: o.id, kind: '72h' })
  }
  return due
}
